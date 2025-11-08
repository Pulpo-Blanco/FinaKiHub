# 🧠 FinaKiHub

**FinaKiHub** es una plataforma educativa gamificada que enseña educación financiera a niños y adolescentes mediante minijuegos interactivos, desafíos y recompensas.  
Su objetivo es promover el aprendizaje de conceptos económicos de forma entretenida, visual y adaptada a diferentes niveles de edad.

---

## 🚀 Características principales

- 🎮 **Minijuegos educativos** sobre ahorro, presupuesto, crédito, inversión y más.  
- 🧩 **Sistema de niveles**: Inicial, Primaria y Secundaria, con contenidos adaptados.  
- 👤 **Perfil de usuario** con progreso, XP, monedas virtuales y logros.  
- 🏪 **Tienda virtual** para personalizar el avatar y desbloquear recompensas.  
- 📈 **Progreso y estadísticas** visibles en tiempo real.  
- ☁️ **Modo offline y sincronización en la nube** (Room + Firebase / MongoDB).  
- 🔊 **Sonidos, animaciones y feedback visual** para mejorar la experiencia infantil.

---

## 🧩 Estructura del proyecto

FinaKiHub/
├── backend/ # API creada con FastAPI y conexión a MongoDB
│ ├── server.py
│ ├── requirements.txt
│ ├── routers/
│ ├── models/
│ └── .env
│
├── frontend/ # Aplicación móvil desarrollada con React Native / Expo
│ ├── app/
│ │ ├── (auth)/ # Pantallas de inicio de sesión y registro
│ │ ├── (tabs)/ # Navegación principal (Inicio, Tienda, Logros, etc.)
│ │ ├── game/ # Minijuegos educativos y retos por nivel
│ │ ├── components/ # Componentes reutilizables (Botones, Banners, etc.)
│ │ └── constants/ # Colores, tipografía, íconos, etc.
│ ├── assets/ # Imágenes, sonidos y videos (banner, monedas, etc.)
│ ├── store/ # Estado global (Zustand)
│ ├── utils/ # Funciones auxiliares (API, validaciones, etc.)
│ ├── package.json
│ └── app.json
│
└── README.md

---

## ⚙️ Instalación y ejecución

### 🔹 Backend (FastAPI + MongoDB)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload

Variables de entorno (.env):
MONGO_URL=mongodb+srv://<usuario>:<contraseña>@<cluster>
DB_NAME=finakihub
PORT=8000
🔹 Frontend (Expo / React Native)
cd frontend
npm install
npx expo start
Puedes probarlo escaneando el código QR desde la app Expo Go (Android/iOS) o ejecutarlo en un emulador.

🧠 Tecnologías utilizadas
🖥️ Frontend

React Native + Expo Router

TypeScript

Zustand para el manejo de estado global

Expo AV para audio y música de fondo

Expo Speech y Reconocimiento de voz

Ionicons y Vector Icons para íconos visuales

Tailwind CSS para React Native (NativeWind)

Animaciones Reanimated y Framer Motion

⚙️ Backend

FastAPI (framework principal)

Pydantic para validación de modelos

MongoDB con Motor (async)

Uvicorn para el servidor

dotenv para configuración de entorno

Firebase / Firestore (sincronización y backup opcional)

| Nivel             | Rango XP | Ambiente visual  | Descripción breve                                                |
| ----------------- | -------- | ---------------- | ---------------------------------------------------------------- |
| 🐣 **Inicial**    | 1–10     | 🌿 **Selva**     | Introducción a conceptos básicos: ahorro, monedas y necesidades. |
| 🏜️ **Primaria**  | 11–20    | 🏜️ **Desierto** | Gestión de presupuesto, decisiones y prioridades.                |
| ❄️ **Secundaria** | 21+      | ❄️ **Antártica** | Inversiones, crédito, deudas, intereses y planificación.         |


🏅 Sistema de recompensas

🪙 Monedas virtuales: ganadas al completar juegos.

💡 XP: aumenta con cada acierto o reto completado.

🧢 Avatar personalizable: ropa, accesorios y fondos.

🏆 Logros desbloqueables: por nivel o desafío especial.

📸 Capturas de pantalla
![Pantalla de inicio](./frontend/assets/images/banner_finaki2.png)
![Juego educativo](./frontend/assets/images/game_example.png)
![Perfil de usuario](./frontend/assets/images/user_profile.png)
💡 Próximas mejoras

Implementación de notificaciones push.

Integración de ranking global con Firebase.

Expansión de minijuegos financieros.

Modo multijugador / cooperativo.

Internacionalización (traducción a otros idiomas).

🤝 Contribuir al proyecto

1. Realiza un fork del repositorio.

2. Crea una nueva rama:
git checkout -b feature/nueva-funcionalidad
3. Realiza tus cambios y haz commit:
git commit -m "Agrega nueva funcionalidad"
4. Sube la rama al repositorio:
git push origin feature/nueva-funcionalidad
5. Crea un Pull Request para revisión.

📄 Licencia

Licencia pendiente de definir.
👨‍💻 Autor

Braulio Montoya
Desarrollador de software y creador del proyecto FinaKiHub
📧 Contacto: geobm6@gmail.com

⭐ Agradecimientos

A la comunidad open source de FastAPI, Expo, React Native y MongoDB.

A los profesores, colegas y colaboradores que inspiraron la creación de FinaKiHub.

Y a todos los niños y jóvenes que aprenderán finanzas jugando. 💚