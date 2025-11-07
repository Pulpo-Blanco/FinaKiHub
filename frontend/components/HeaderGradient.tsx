import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize } from '../constants/Colors';

type Props = {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  compact?: boolean;
  style?: ViewStyle;
  colors?: [string, string]; // opcional: forzar colores
};

export default function HeaderGradient({ title, subtitle, rightSlot, compact, style, colors }: Props) {
  const CG: [string, string] = colors ?? ['#34d399', '#2563eb']; // verde->azul por defecto
  return (
    <LinearGradient
      colors={CG}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.header, compact && styles.headerCompact, style]}
    >
      <View style={[styles.inner, compact && styles.innerCompact]}>
        <View style={{ flex: 1 }}>
          {!!title && <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>}
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  headerCompact: { paddingTop: Spacing.md, paddingBottom: Spacing.md },
  inner: { paddingHorizontal: Spacing.lg },
  innerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  titleCompact: { fontSize: FontSize.xl },
  subtitle: { color: '#eaf2ff', marginTop: 6 },
});
