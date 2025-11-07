// components/SectionCard.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/Colors';

type Props = {
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  children: React.ReactNode;
  elevated?: boolean;
};

export default function SectionCard({ title, subtitle, style, children, elevated }: Props) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {(title || subtitle) && (
        <View style={{ marginBottom: Spacing.sm }}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius?.xl ?? 20,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  elevated: { transform: [{ translateY: -6 }] },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 2 },
});
