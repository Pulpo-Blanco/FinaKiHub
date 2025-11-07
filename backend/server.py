# server.py — FinakiHub API (versión lint-friendly)
# pylint: disable=missing-module-docstring,missing-class-docstring,missing-function-docstring,line-too-long,wrong-import-order,unused-variable

# ------------------------ IMPORTS (ordenados) ------------------------
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

# ------------------------ CONFIG INICIAL -----------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ------------------------ HELPERS DE ERRORES -------------------------
def http_500(msg: str, err: Exception):
    """Log + HTTP 500 encadenado."""
    logger.exception("%s: %s", msg, err)
    raise HTTPException(status_code=500, detail=msg) from err


def bad_request(msg: str, err: Exception):
    """Log + HTTP 400 encadenado."""
    logger.warning("%s: %s", msg, err)
    raise HTTPException(status_code=400, detail=msg) from err


# ------------------------ ENDPOINTS DE PRUEBA ------------------------
@api_router.get("/health")
async def health():
    return {"status": "ok"}


@api_router.get("/db-ping")
async def db_ping():
    try:
        await db.command("ping")
        return {"db": "ok"}
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("No se pudo conectar a la base de datos", e)


# ------------------------ MODELOS ------------------------------------
class User(BaseModel):
    username: str
    age: int
    avatar_config: Dict = Field(default_factory=dict)
    coins: int = Field(default=0)
    level: int = Field(default=1)
    xp: int = Field(default=0)
    badges: List[str] = Field(default_factory=list)
    purchased_items: List[str] = Field(default_factory=list)
    equipped_items: Dict = Field(default_factory=dict)
    selected_level: str = Field(default="primaria")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    username: str
    age: int
    avatar_config: Dict = Field(default_factory=lambda: {"color": "blue", "style": "default"})


class UserLogin(BaseModel):
    username: str


class UserResponse(BaseModel):
    id: str
    username: str
    age: int
    avatar_config: Dict
    coins: int
    level: int
    xp: int
    badges: List[str]
    purchased_items: List[str]
    equipped_items: Dict
    selected_level: str


class Progress(BaseModel):
    user_id: str
    completed_modules: List[str] = Field(default_factory=list)
    module_scores: Dict[str, int] = Field(default_factory=dict)
    total_score: int = Field(default=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LemonadeGameState(BaseModel):
    user_id: str
    current_day: int = Field(default=1)
    total_days: int = Field(default=5)
    initial_money: float = Field(default=20.0)
    current_money: float
    days_data: List[Dict] = Field(default_factory=list)
    total_profit: float = Field(default=0.0)
    total_savings: float = Field(default=0.0)
    completed: bool = False
    score: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CoinUpdate(BaseModel):
    user_id: str
    coins: int


class BadgeUnlock(BaseModel):
    user_id: str
    badge_id: str


class AvatarUpdate(BaseModel):
    user_id: str
    avatar_config: Dict


class LevelUpdate(BaseModel):
    user_id: str
    level: str


class PurchaseItem(BaseModel):
    user_id: str
    item_id: str
    price: int


class EquipItem(BaseModel):
    user_id: str
    category: str
    item_id: Optional[str] = None


class AddXP(BaseModel):
    user_id: str
    xp: int


# ------------------------ HELPERS DE NEGOCIO -------------------------
def calculate_level_from_xp(xp: int) -> int:
    return max(1, (xp // 100) + 1)


def user_dict_to_response(user_dict) -> Optional[UserResponse]:
    if not user_dict or not isinstance(user_dict, dict):
        logger.error("user_dict_to_response recibió datos inválidos: %s", user_dict)
        return None
    try:
        user_id = str(user_dict["_id"])
    except KeyError:
        logger.error("user_dict_to_response: _id falta en user_dict: %s", user_dict)
        return None

    xp = user_dict.get("xp", 0)
    calculated_level = calculate_level_from_xp(xp)
    equipped = user_dict.get("equipped_items", {})
    if not isinstance(equipped, dict):
        equipped = {}

    for field in ("username", "age"):
        if field not in user_dict:
            logger.error("Falta el campo '%s' en user_dict id=%s", field, user_id)
            return None

    try:
        return UserResponse(
            id=user_id,
            username=user_dict["username"],
            age=user_dict["age"],
            avatar_config=user_dict.get("avatar_config", {}),
            coins=user_dict.get("coins", 0),
            level=calculated_level,
            xp=xp,
            badges=user_dict.get("badges", []),
            purchased_items=user_dict.get("purchased_items", []),
            equipped_items=equipped,
            selected_level=user_dict.get("selected_level", "primaria"),
        )
    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error("Error Pydantic UserResponse user_id=%s: %s", user_id, e)
        logger.error("Datos que causaron el error: %s", user_dict)
        return None


CAT_EN_TO_ES = {
    "hat": "sombrero",
    "accessory": "accesorio",
    "background": "fondo",
    "special": "especiales",
}
CAT_ES_TO_EN = {v: k for k, v in CAT_EN_TO_ES.items()}


def normalize_cat_to_en(cat: str) -> str:
    cat_lower = (cat or "").strip().lower()
    if cat_lower in CAT_EN_TO_ES:
        return cat_lower
    if cat_lower in CAT_ES_TO_EN:
        return CAT_ES_TO_EN[cat_lower]
    logger.warning("Categoría desconocida al normalizar: %s", cat)
    return cat_lower


# ------------------------ AUTH ---------------------------------------
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, request: Request):
    try:
        raw_body = await request.json()
        logger.info("==> REGISTRO (raw): %s", raw_body)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("JSON inválido", e)

    logger.info("==> REGISTRO (validados): %s", user_data.dict())

    try:
        existing_user = await db.users.find_one({"username": user_data.username})
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("Error al verificar el usuario", e)

    if existing_user:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    now = datetime.now(timezone.utc)
    user_dict_for_db = {
        "username": user_data.username,
        "age": user_data.age,
        "avatar_config": user_data.avatar_config,
        "coins": 0,
        "level": 1,
        "xp": 0,
        "badges": [],
        "purchased_items": [],
        "equipped_items": {},
        "selected_level": "primaria",
        "created_at": now,
    }

    try:
        result = await db.users.insert_one(user_dict_for_db)
        inserted_id = result.inserted_id
        logger.info("Usuario '%s' creado (ID %s)", user_data.username, inserted_id)

        progress_data = Progress(user_id=str(inserted_id), updated_at=now)
        await db.progress.insert_one(progress_data.dict())

        created_user_doc = await db.users.find_one({"_id": inserted_id})
        if not created_user_doc:
            raise HTTPException(status_code=500, detail="Error al verificar la creación del usuario")

        response_user = user_dict_to_response(created_user_doc)
        if response_user is None:
            raise HTTPException(status_code=500, detail="Error al formatear la respuesta del usuario")

        return response_user
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail) from e
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("Ocurrió un error interno durante el registro.", e)


@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    response = user_dict_to_response(user)
    if response is None:
        raise HTTPException(status_code=500, detail="Error al procesar datos del usuario.")
    return response


# ------------------------ USER ---------------------------------------
@api_router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    try:
        obj_id = ObjectId(user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    response = user_dict_to_response(user)
    if response is None:
        raise HTTPException(status_code=500, detail="Error al procesar datos del usuario.")
    return response


@api_router.put("/user/avatar", response_model=UserResponse)
async def update_avatar(data: AvatarUpdate):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    result = await db.users.update_one({"_id": obj_id}, {"$set": {"avatar_config": data.avatar_config}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await db.users.find_one({"_id": obj_id})
    response = user_dict_to_response(user)
    if response is None:
        raise HTTPException(status_code=500, detail="Error al procesar datos del usuario.")
    return response


@api_router.put("/user/level", response_model=UserResponse)
async def update_level(data: LevelUpdate):
    allowed_levels = ["inicial", "primaria", "secundaria"]
    if data.level not in allowed_levels:
        raise HTTPException(status_code=400, detail="Nivel no válido")

    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    result = await db.users.update_one({"_id": obj_id}, {"$set": {"selected_level": data.level}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await db.users.find_one({"_id": obj_id})
    response = user_dict_to_response(user)
    if response is None:
        raise HTTPException(status_code=500, detail="Error al procesar datos del usuario.")
    return response


# ------------------------ PROGRESS -----------------------------------
@api_router.get("/progress/{user_id}", response_model=Progress)
async def get_progress(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="ID de usuario requerido")

    progress = await db.progress.find_one({"user_id": user_id})
    if not progress:
        logger.info("Creando progreso inicial para user_id: %s", user_id)
        new_progress = Progress(user_id=user_id, updated_at=datetime.now(timezone.utc))
        try:
            await db.progress.insert_one(new_progress.dict())
            progress = await db.progress.find_one({"user_id": user_id})
            if not progress:
                raise HTTPException(status_code=500, detail="Error al crear el progreso inicial")
        except HTTPException as e:
            raise HTTPException(status_code=e.status_code, detail=e.detail) from e
        except Exception as e:  # pylint: disable=broad-exception-caught
            http_500("Error al crear el progreso inicial", e)

    return progress


@api_router.post("/progress/update")
async def update_progress(progress_data: Progress):
    try:
        result = await db.progress.update_one(
            {"user_id": progress_data.user_id},
            {
                "$set": {
                    "completed_modules": progress_data.completed_modules,
                    "module_scores": progress_data.module_scores,
                    "total_score": progress_data.total_score,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
        was_upserted = result.upserted_id is not None
        was_modified = result.modified_count > 0
        return {
            "success": True,
            "message": "Progreso actualizado"
            if was_modified
            else "Progreso creado"
            if was_upserted
            else "No hubo cambios",
            "modified": was_modified,
            "created": was_upserted,
        }
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("Error al actualizar el progreso.", e)


# ------------------------ MODULES ------------------------------------
@api_router.get("/modules/{level}")
async def get_modules_by_level(level: str):
    modules_db = {
        "inicial": [
            {
                "id": "coin_recognition",
                "title": "Reconoce las Monedas",
                "description": "Aprende a identificar diferentes monedas",
                "icon": "🪙",
                "coins_reward": 20,
                "type": "game",
                "level": "inicial",
            },
            {
                "id": "needs_wants",
                "title": "Necesito o Quiero",
                "description": "Diferencia entre necesidades y deseos",
                "icon": "🎈",
                "coins_reward": 25,
                "type": "quiz",
                "level": "inicial",
            },
            {
                "id": "piggy_bank",
                "title": "Mi Alcancía",
                "description": "Aprende por qué es importante ahorrar",
                "icon": "🐽",
                "coins_reward": 20,
                "type": "story",
                "level": "inicial",
            },
            {
                "id": "counting_money",
                "title": "Contar Dinero",
                "description": "Practica sumando monedas",
                "icon": "🧮",
                "coins_reward": 25,
                "type": "game",
                "level": "inicial",
            },
        ],
        "primaria": [
            {
                "id": "lemonade_stand",
                "title": "Puesto de Limonada",
                "description": "Aprende sobre presupuesto con tu propio negocio",
                "icon": "🍋",
                "coins_reward": 50,
                "type": "game",
                "level": "primaria",
            },
            {
                "id": "savings_challenge",
                "title": "Desafío de Ahorro",
                "description": "Ahorra para comprar algo que deseas",
                "icon": "🐷",
                "coins_reward": 30,
                "type": "challenge",
                "level": "primaria",
            },
            {
                "id": "simple_interest",
                "title": "Interés Simple",
                "description": "Descubre cómo crece tu dinero",
                "icon": "💰",
                "coins_reward": 40,
                "type": "tutorial",
                "level": "primaria",
            },
            {
                "id": "debt_game",
                "title": "Préstamos y Deudas",
                "description": "Aprende sobre pedir prestado dinero",
                "icon": "🏦",
                "coins_reward": 45,
                "type": "roleplay",
                "level": "primaria",
            },
        ],
        "secundaria": [
            {
                "id": "stock_market",
                "title": "Bolsa de Valores",
                "description": "Invierte en acciones y aprende sobre el mercado",
                "icon": "📈",
                "coins_reward": 60,
                "type": "simulation",
                "level": "secundaria",
            },
            {
                "id": "credit_cards",
                "title": "Tarjetas de Crédito",
                "description": "Entiende cómo funcionan y sus riesgos",
                "icon": "💳",
                "coins_reward": 55,
                "type": "simulator",
                "level": "secundaria",
            },
            {
                "id": "compound_interest",
                "title": "Interés Compuesto",
                "description": "El poder del crecimiento exponencial",
                "icon": "📊",
                "coins_reward": 50,
                "type": "calculator",
                "level": "secundaria",
            },
            {
                "id": "budget_planning",
                "title": "Presupuesto Personal",
                "description": "Planifica tu futuro financiero",
                "icon": "📋",
                "coins_reward": 65,
                "type": "planner",
                "level": "secundaria",
            },
        ],
    }
    modules = modules_db.get(level)
    if modules is None:
        raise HTTPException(status_code=400, detail="Nivel no válido")
    return modules


@api_router.get("/modules/primary")
async def get_primary_modules():
    logger.warning("Endpoint /modules/primary está obsoleto, usar /modules/primaria")
    return await get_modules_by_level("primaria")


# ------------------------ GAME ---------------------------------------
@api_router.post("/game/lemonade")
async def save_lemonade_game(game: LemonadeGameState):
    try:
        await db.lemonade_games.update_one(
            {"user_id": game.user_id},
            {
                "$set": game.dict(exclude={"user_id", "updated_at"}),
                "$currentDate": {"updated_at": True},
            },
            upsert=True,
        )
        return {"success": True, "score": game.score}
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("Error al guardar el estado del juego.", e)


@api_router.get("/game/lemonade/{user_id}")
async def get_lemonade_game(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="ID de usuario requerido")
    try:
        game = await db.lemonade_games.find_one({"user_id": user_id})
        return game if game else None
    except Exception as e:  # pylint: disable=broad-exception-caught
        http_500("Error al obtener el estado del juego.", e)


# ------------------------ COINS & BADGES -----------------------------
@api_router.post("/coins/add")
async def add_coins(data: CoinUpdate):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    if data.coins == 0:
        raise HTTPException(status_code=400, detail="La cantidad de monedas debe ser distinta de cero")

    result = await db.users.update_one({"_id": obj_id}, {"$inc": {"coins": data.coins}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user = await db.users.find_one({"_id": obj_id}, {"coins": 1})
    new_total = user.get("coins", 0) if user else 0
    return {"success": True, "new_total": new_total}


@api_router.post("/badges/unlock")
async def unlock_badge(data: BadgeUnlock):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    if not data.badge_id:
        raise HTTPException(status_code=400, detail="ID de insignia requerido")

    result = await db.users.update_one({"_id": obj_id}, {"$addToSet": {"badges": data.badge_id}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    new_badge_unlocked = result.modified_count > 0
    return {"success": True, "new_badge": new_badge_unlocked}


# ------------------------ SHOP ---------------------------------------
@api_router.get("/shop/items")
async def get_shop_items():
    items = [
        {"id": "hat_cap", "name": "Gorra Cool", "category": "hat", "price": 10, "icon": "🧢"},
        {"id": "hat_crown", "name": "Corona Real", "category": "hat", "price": 25, "icon": "👑"},
        {"id": "hat_wizard", "name": "Sombrero Mago", "category": "hat", "price": 20, "icon": "🎩"},
        {"id": "hat_party", "name": "Gorro Fiesta", "category": "hat", "price": 15, "icon": "🎉"},
        {"id": "hat_graduate", "name": "Birrete", "category": "hat", "price": 30, "icon": "🎓"},
        {"id": "acc_glasses", "name": "Lentes Cool", "category": "accessory", "price": 15, "icon": "🕶️"},
        {"id": "acc_star", "name": "Estrella", "category": "accessory", "price": 20, "icon": "⭐"},
        {"id": "acc_medal", "name": "Medalla", "category": "accessory", "price": 25, "icon": "🏅"},
        {"id": "acc_watch", "name": "Reloj", "category": "accessory", "price": 30, "icon": "⌚"},
        {"id": "acc_bag", "name": "Mochila", "category": "accessory", "price": 18, "icon": "🎒"},
        {"id": "bg_sunset", "name": "Atardecer", "category": "background", "price": 20, "icon": "🌅"},
        {"id": "bg_space", "name": "Espacio", "category": "background", "price": 35, "icon": "🌌"},
        {"id": "bg_beach", "name": "Playa", "category": "background", "price": 25, "icon": "🏖️"},
        {"id": "bg_city", "name": "Ciudad", "category": "background", "price": 30, "icon": "🏙️"},
        {"id": "bg_forest", "name": "Bosque", "category": "background", "price": 28, "icon": "🌲"},
        {"id": "special_rocket", "name": "Cohete", "category": "special", "price": 50, "icon": "🚀"},
        {"id": "special_trophy", "name": "Trofeo Oro", "category": "special", "price": 75, "icon": "🏆"},
        {"id": "special_diamond", "name": "Diamante", "category": "special", "price": 100, "icon": "💎"},
    ]
    return items


@api_router.post("/shop/purchase")
async def purchase_item(data: PurchaseItem):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    if not data.item_id:
        raise HTTPException(status_code=400, detail="ID de artículo requerido")
    if data.price < 0:
        raise HTTPException(status_code=400, detail="El precio no puede ser negativo")

    user = await db.users.find_one_and_update(
        {"_id": obj_id, "coins": {"$gte": data.price}, "purchased_items": {"$ne": data.item_id}},
        {"$inc": {"coins": -data.price}, "$push": {"purchased_items": data.item_id}},
        projection={"coins": 1},
        return_document=True,
    )
    if not user:
        try:
            check_user = await db.users.find_one({"_id": obj_id}, {"coins": 1, "purchased_items": 1})
        except Exception as e:  # pylint: disable=broad-exception-caught
            http_500("Error al consultar usuario para compra", e)

        if not check_user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if check_user.get("coins", 0) < data.price:
            raise HTTPException(status_code=400, detail="No tienes suficientes monedas")
        if data.item_id in check_user.get("purchased_items", []):
            raise HTTPException(status_code=400, detail="Ya compraste este artículo")
        raise HTTPException(status_code=500, detail="No se pudo completar la compra")

    return {"success": True, "new_coins": user.get("coins", 0)}


@api_router.post("/shop/equip")
async def equip_item(data: EquipItem):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    cat_en = normalize_cat_to_en(data.category)
    if not cat_en or cat_en not in CAT_EN_TO_ES:
        raise HTTPException(status_code=400, detail=f"Categoría inválida: {data.category}")

    cat_es = CAT_EN_TO_ES[cat_en]
    update_operation: Dict[str, Dict] = {}

    if data.item_id:
        user = await db.users.find_one({"_id": obj_id, "purchased_items": data.item_id}, {"_id": 1})
        if not user:
            check_user = await db.users.find_one({"_id": obj_id}, {"purchased_items": 1})
            if not check_user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            raise HTTPException(status_code=400, detail="No has comprado este artículo")
        update_operation["$set"] = {
            f"equipped_items.{cat_en}": data.item_id,
            f"equipped_items.{cat_es}": data.item_id,
        }
    else:
        update_operation["$unset"] = {
            f"equipped_items.{cat_en}": "",
            f"equipped_items.{cat_es}": "",
        }

    result = await db.users.update_one({"_id": obj_id}, update_operation)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado al intentar equipar")

    updated_user = await db.users.find_one({"_id": obj_id}, {"equipped_items": 1})
    equipped_items = updated_user.get("equipped_items", {}) if updated_user else {}
    return {"success": True, "equipped_items": equipped_items}


# ------------------------ XP & LEVEL ---------------------------------
@api_router.post("/xp/add")
async def add_xp(data: AddXP):
    try:
        obj_id = ObjectId(data.user_id)
    except Exception as e:  # pylint: disable=broad-exception-caught
        bad_request("ID de usuario inválido", e)

    if data.xp <= 0:
        raise HTTPException(status_code=400, detail="La cantidad de XP debe ser positiva")

    user_before_update = await db.users.find_one_and_update(
        {"_id": obj_id},
        {"$inc": {"xp": data.xp}},
        projection={"xp": 1, "coins": 1},
        return_document=False,
    )
    if not user_before_update:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    old_xp = user_before_update.get("xp", 0)
    new_xp = old_xp + data.xp
    old_level = calculate_level_from_xp(old_xp)
    new_level = calculate_level_from_xp(new_xp)

    level_up = new_level > old_level
    bonus_coins = 0
    if level_up:
        bonus_coins = new_level * 10
        await db.users.update_one({"_id": obj_id}, {"$inc": {"coins": bonus_coins}})

    user_after_update = await db.users.find_one({"_id": obj_id}, {"coins": 1})
    final_coins = (
        user_after_update.get("coins", 0) if user_after_update else user_before_update.get("coins", 0) + bonus_coins
    )

    return {
        "success": True,
        "new_xp": new_xp,
        "new_level": new_level,
        "level_up": level_up,
        "bonus_coins": bonus_coins,
        "total_coins": final_coins,
    }


# ------------------------ ROOT & CORS --------------------------------
@api_router.get("/")
async def root():
    return {"message": "FinakiHub API", "status": "running"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------ SHUTDOWN -----------------------------------
@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Cerrando conexión con MongoDB...")
    client.close()
    logger.info("Conexión con MongoDB cerrada.")
