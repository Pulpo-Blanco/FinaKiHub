// ✅ Archivo: components/BackButton.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

type BackButtonProps = {
  /** Texto al lado del icono */
  label?: string;
  /** Desactivar botón */
  disabled?: boolean;
  /** Ruta a la que navegar; si no se pasa, hace back() */
  href?: string;
  /** Opcional: estilo visual (acepta cualquier string para no romper _layout.tsx) */
  tint?: string;
};

export default function BackButton({
  label = 'Volver',
  disabled = false,
  href,
  tint,
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (disabled) return;
    if (href) router.replace(href as any);
    else router.back();
  };

  const isGhost = tint === 'ghost';
  const baseBg = isGhost ? (Colors.background ?? '#F5F7FA') : (Colors.white ?? '#FFFFFF');
  const baseBorder = Colors.border ?? '#E2E8F0';

  return (
    <Pressable
      accessibilityLabel="Volver atrás"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: baseBg, borderColor: baseBorder },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Ionicons
        name="chevron-back"
        size={20}
        color={disabled ? (Colors.textLight ?? '#94A3B8') : (Colors.text ?? '#0F172A')}
      />
      <Text
        style={[
          styles.label,
          { color: disabled ? (Colors.textLight ?? '#94A3B8') : (Colors.text ?? '#0F172A') },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontWeight: '600', fontSize: 14 },
});

