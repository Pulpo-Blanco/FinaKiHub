#!/usr/bin/env python3
"""
FinaKiHub - Backend API Test Suite
Autor: Braulio Montoya

Script de verificación general del backend (FastAPI + MongoDB).
Realiza pruebas automáticas básicas sobre los endpoints principales
para comprobar la correcta comunicación entre servidor y base de datos.
"""

import requests
import sys

# ==============================================
# CONFIGURACIÓN
# ==============================================
# Cambia esta URL si tu API está desplegada en otro servidor o puerto
BASE_URL = "http://localhost:8000/api"


class FinaKiHubAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_user_id = None
        self.results = []

    # ----------------------------------------------
    # MÉTODOS DE UTILIDAD
    # ----------------------------------------------
    def log_result(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   → {details}")
        self.results.append((test_name, success, details))

    # ----------------------------------------------
    # PRUEBAS DE AUTENTICACIÓN
    # ----------------------------------------------
    def test_register_user(self):
        """POST /api/auth/register"""
        payload = {"username": "testuser1", "age": 10}
        try:
            response = self.session.post(f"{self.base_url}/auth/register", json=payload)
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    self.test_user_id = data["id"]
                    self.log_result("Register User", True, f"Usuario creado ID={self.test_user_id}")
                    return True
            self.log_result("Register User", False, f"Código {response.status_code}")
        except Exception as e:
            self.log_result("Register User", False, f"Error: {e}")
        return False

    def test_login_user(self):
        """POST /api/auth/login"""
        payload = {"username": "testuser1"}
        try:
            response = self.session.post(f"{self.base_url}/auth/login", json=payload)
            if response.status_code == 200:
                self.log_result("Login User", True)
                return True
            self.log_result("Login User", False, f"Código {response.status_code}")
        except Exception as e:
            self.log_result("Login User", False, f"Error: {e}")
        return False

    # ----------------------------------------------
    # PRUEBA DE PERFIL DE USUARIO
    # ----------------------------------------------
    def test_get_profile(self):
        """GET /api/user/{user_id}"""
        if not self.test_user_id:
            self.log_result("Get Profile", False, "No hay user_id disponible")
            return False
        try:
            response = self.session.get(f"{self.base_url}/user/{self.test_user_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_user_id:
                    self.log_result("Get Profile", True)
                    return True
            self.log_result("Get Profile", False, f"Código {response.status_code}")
        except Exception as e:
            self.log_result("Get Profile", False, f"Error: {e}")
        return False

    # ----------------------------------------------
    # EJECUCIÓN GENERAL
    # ----------------------------------------------
    def run_tests(self):
        print(f"🚀 Iniciando pruebas del backend FinaKiHub")
        print(f"📍 API Base: {self.base_url}")
        print("=" * 60)

        # Autenticación
        print("\n🔐 AUTENTICACIÓN")
        self.test_register_user()
        self.test_login_user()

        # Perfil de usuario
        print("\n👤 PERFIL DE USUARIO")
        self.test_get_profile()

        # Resumen
        print("\n📋 RESUMEN DE PRUEBAS")
        print("=" * 60)
        passed = sum(1 for _, ok, _ in self.results if ok)
        total = len(self.results)
        print(f"✅ Éxitos: {passed}/{total}")
        print(f"❌ Fallos: {total - passed}/{total}")

        if total - passed > 0:
            print("\nDetalles de fallos:")
            for name, ok, details in self.results:
                if not ok:
                    print(f" - {name}: {details}")

        return passed == total


# ----------------------------------------------
# PUNTO DE ENTRADA
# ----------------------------------------------
if __name__ == "__main__":
    tester = FinaKiHubAPITester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)
