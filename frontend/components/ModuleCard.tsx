import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/Colors';
import { Module } from '../utils/api';

interface ModuleCardProps {
  module: Module;
  completed?: boolean;
  onPress: () => void;
}

export default function ModuleCard({ module, completed, onPress }: ModuleCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, completed && styles.completedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{module.icon}</Text>
        {completed && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={16} color={Colors.white} />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.description}>{module.description}</Text>
        <View style={styles.footer}>
          <View style={styles.reward}>
            <Ionicons name="diamond" size={16} color={Colors.coin} />
            <Text style={styles.rewardText}>+{module.coins_reward}</Text>
          </View>
          {!completed && (
            <Text style={styles.startText}>Comenzar</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  icon: {
    fontSize: 32,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  startText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});