// frontend/app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import BackButton from '../components/BackButton';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={({ route }) => {
        const hideBack =
          route.name.startsWith('(auth)') || // todo el grupo auth
          route.name === 'index' ||
          route.name === 'level-select' ||
          route.name.startsWith('(tabs)'); // menú principal

        return {
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: Colors.white },
          headerShadowVisible: false,
          headerTintColor: Colors.text,
          headerLeft: hideBack ? undefined : () => <BackButton tint="dark" />,
        };
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="level-select" options={{ title: 'Selecciona tu Nivel' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
