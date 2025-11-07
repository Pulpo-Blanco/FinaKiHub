import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/Colors';

interface BadgeCardProps {
  badgeId: string;
  unlocked?: boolean;
}

const BADGES: Record<string, { icon: string; name: string; description: string; color: string }> = {
  first_module: {
    icon: 'star',
    name: 'Primer Paso',
    description: 'Completaste tu primer módulo',
    color: '#FFD700',
  },
  lemonade_master: {
    icon: 'trophy',
    name: 'Maestro de Limonada',
    description: 'Dominaste el presupuesto',
    color: '#FF6B6B',
  },
  saver: {
    icon: 'shield-checkmark',
    name: 'Ahorrador',
    description: 'Completaste el desafío de ahorro',
    color: '#4ECDC4',
  },
  financial_wizard: {
    icon: 'sparkles',
    name: 'Mago Financiero',
    description: 'Completaste todos los módulos',
    color: '#9B59B6',
  },
};

export default function BadgeCard({ badgeId, unlocked = false }: BadgeCardProps) {
  const badge = BADGES[badgeId] || BADGES.first_module;

  return (
    <View style={[styles.card, !unlocked && styles.lockedCard]}>
      <View style={[styles.iconContainer, { backgroundColor: unlocked ? badge.color : Colors.border }]}>
        <Ionicons
          name={unlocked ? badge.icon as any : 'lock-closed'}
          size={32}
          color={Colors.white}
        />
      </View>
      <Text style={[styles.name, !unlocked && styles.lockedText]}>{badge.name}</Text>
      <Text style={[styles.description, !unlocked && styles.lockedText]}>
        {unlocked ? badge.description : '???'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedCard: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
  lockedText: {
    color: Colors.border,
  },
});