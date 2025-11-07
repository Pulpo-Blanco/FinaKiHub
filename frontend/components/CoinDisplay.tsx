import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/Colors';

interface CoinDisplayProps {
  coins: number;
  size?: 'small' | 'medium' | 'large';
}

export default function CoinDisplay({ coins, size = 'medium' }: CoinDisplayProps) {
  const iconSizes = { small: 16, medium: 20, large: 28 };
  const fontSizes = { small: FontSize.sm, medium: FontSize.md, large: FontSize.xl };

  return (
    <View style={[styles.container, size === 'large' && styles.largeContainer]}>
      <Ionicons name="diamond" size={iconSizes[size]} color={Colors.coin} />
      <Text style={[styles.text, { fontSize: fontSizes[size] }]}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    gap: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  largeContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  text: {
    fontWeight: '700',
    color: Colors.text,
  },
});