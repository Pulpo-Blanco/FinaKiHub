// app/(auth)/_layout.tsx
import * as React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,          // Oculta el título "(auth)/inicio de sesión"
        animation: 'fade',           // Transición suave
        contentStyle: { backgroundColor: '#F5F7FA' }, // Fondo limpio y uniforme
      }}
    />
  );
}
