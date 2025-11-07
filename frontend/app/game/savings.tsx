import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { addCoins, addXP, updateProgress, unlockBadge, getProgress } from '../../utils/api';
import Button from '../../components/Button';
import CoinDisplay from '../../components/CoinDisplay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface WeekData {
  week: number;
  saved: number;
  totalSaved: number;
}

export default function SavingsGame() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const updateCoins = useUserStore((state) => state.updateCoins);
  const updateXP = useUserStore((state) => state.updateXP);
  const addBadge = useUserStore((state) => state.addBadge);

  const [gamePhase, setGamePhase] = useState<'intro' | 'setup' | 'saving' | 'summary'>('intro');
  const [goal, setGoal] = useState('');
  const [goalName, setGoalName] = useState('');
  const [weeklyIncome, setWeeklyIncome] = useState('10');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weeklySaving, setWeeklySaving] = useState('');
  const [totalSaved, setTotalSaved] = useState(0);
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [weekResult, setWeekResult] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);

  const TOTAL_WEEKS = 8;
  const goalAmount = parseFloat(goal) || 0;
  const income = parseFloat(weeklyIncome) || 10;

  const handleSetupGoal = () => {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Por favor ingresa qué quieres comprar');
      return;
    }

    if (!goal || goalAmount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un precio válido');
      return;
    }

    if (goalAmount < 5 || goalAmount > 100) {
      Alert.alert('Error', 'El precio debe estar entre $5 y $100');
      return;
    }

    setGamePhase('saving');
  };

  const handleWeeklySaving = () => {
    const saved = parseFloat(weeklySaving);

    if (isNaN(saved) || saved < 0) {
      Alert.alert('Error', 'Por favor ingresa una cantidad válida');
      return;
    }

    if (saved > income) {
      Alert.alert('Error', `Solo puedes ahorrar hasta $${income} esta semana`);
      return;
    }

    const newTotal = totalSaved + saved;
    const weekData: WeekData = {
      week: currentWeek,
      saved: saved,
      totalSaved: newTotal,
    };

    setWeekResult(weekData);
    setWeeksData([...weeksData, weekData]);
    setTotalSaved(newTotal);
    setShowResultModal(true);
  };

  const handleNextWeek = () => {
    setShowResultModal(false);
    setWeeklySaving('');

    if (totalSaved >= goalAmount) {
      setGamePhase('summary');
    } else if (currentWeek < TOTAL_WEEKS) {
      setCurrentWeek(currentWeek + 1);
    } else {
      setGamePhase('summary');
    }
  };

  const calculateScore = () => {
    const weeksNeeded = weeksData.length;
    const achieved = totalSaved >= goalAmount;
    const avgSavingRate = (totalSaved / (income * weeksNeeded)) * 100;

    let score = 50;
    if (achieved) {
      score = 100 - (weeksNeeded * 5); // Menos semanas = mejor score
      score = Math.max(60, score);
    } else {
      score = Math.floor((totalSaved / goalAmount) * 50);
    }

    return { score, achieved, weeksNeeded, avgSavingRate };
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { score, achieved } = calculateScore();

      // Add coins
      const coinsEarned = achieved ? 30 : 20;
      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      // Add XP
      const xpEarned = 75;
      const xpResult = await addXP(user.id, xpEarned);
      updateXP(xpResult.new_xp, xpResult.new_level);

      // Update progress
      const currentProgress = await getProgress(user.id);
      const completedModules = currentProgress.completed_modules || [];

      if (!completedModules.includes('savings_challenge')) {
        completedModules.push('savings_challenge');

        await updateProgress({
          user_id: user.id,
          completed_modules: completedModules,
          module_scores: {
            ...currentProgress.module_scores,
            savings_challenge: score,
          },
          total_score: currentProgress.total_score + score,
        });

        // Unlock badge
        await unlockBadge(user.id, 'saver');
        addBadge('saver');
      }

      if (xpResult.level_up) {
        Alert.alert(
          '🎉 ¡SUBISTE DE NIVEL!',
          `¡Felicidades! Ahora eres nivel ${xpResult.new_level}\n\nBonificación: +${xpResult.bonus_coins} monedas`,
          [{ text: 'Genial', onPress: () => showFinalAlert(coinsEarned, xpEarned, achieved) }]
        );
      } else {
        showFinalAlert(coinsEarned, xpEarned, achieved);
      }
    } catch (error) {
      console.error('Error completing game:', error);
      Alert.alert('Error', 'No se pudo guardar tu progreso.');
    } finally {
      setLoading(false);
    }
  };

  const showFinalAlert = (coins: number, xp: number, achieved: boolean) => {
    Alert.alert(
      achieved ? '¡Felicidades! 🎉' : '¡Buen intento! 💪',
      `${achieved ? 'Lograste tu meta de ahorro' : 'Aprendiste sobre el ahorro'}.\n\n💰 Ganaste: ${coins} monedas\n⭐ XP ganado: ${xp}`,
      [
        { text: 'Ver Tienda', onPress: () => router.push('/(tabs)/shop') },
        { text: 'Volver', onPress: () => router.back() },
      ]
    );
  };

  if (!user) return null;

  // Intro Phase
  if (gamePhase === 'intro') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.introContainer}>
          <Text style={styles.introIcon}>🐷</Text>
          <Text style={styles.introTitle}>Desafío de Ahorro</Text>
          <Text style={styles.introSubtitle}>¡Aprende a ahorrar para tus metas!</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Cómo Funciona</Text>
            <Text style={styles.instruction}>🎯 Elige algo que quieres comprar</Text>
            <Text style={styles.instruction}>💵 Recibes $10 cada semana (mesada)</Text>
            <Text style={styles.instruction}>🐷 Decide cuánto ahorrar cada semana</Text>
            <Text style={styles.instruction}>📅 Tienes 8 semanas para lograr tu meta</Text>
            <Text style={styles.instruction}>🏆 ¡Mientras antes lo logres, mejor!</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Consejos</Text>
            <Text style={styles.tip}>• No tienes que ahorrar todo cada semana</Text>
            <Text style={styles.tip}>• Ser constante es mejor que ahorrar mucho una vez</Text>
            <Text style={styles.tip}>• Piensa en cuánto necesitas ahorrar por semana</Text>
          </View>

          <Button title="¡Comenzar Desafío!" onPress={() => setGamePhase('setup')} size="large" />
        </View>
      </ScrollView>
    );
  }

  // Setup Phase
  if (gamePhase === 'setup') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🎯 Define tu Meta</Text>

        <View style={styles.card}>
          <Text style={styles.label}>¿Qué quieres comprar?</Text>
          <TextInput
            style={styles.input}
            value={goalName}
            onChangeText={setGoalName}
            placeholder="Ejemplo: Una pelota"
          />

          <Text style={styles.label}>¿Cuánto cuesta?</Text>
          <TextInput
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
            placeholder="Ejemplo: 25"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Entre $5 y $100</Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.accent} />
            <Text style={styles.infoText}>
              Recibirás $10 cada semana. Calcula cuánto necesitas ahorrar.
            </Text>
          </View>

          {goalAmount > 0 && (
            <View style={styles.calculation}>
              <Text style={styles.calcText}>
                Si ahorras $5 cada semana, te tomará {Math.ceil(goalAmount / 5)} semanas
              </Text>
              <Text style={styles.calcText}>
                Si ahorras $8 cada semana, te tomará {Math.ceil(goalAmount / 8)} semanas
              </Text>
            </View>
          )}

          <Button title="Comenzar a Ahorrar" onPress={handleSetupGoal} />
        </View>
      </ScrollView>
    );
  }

  // Saving Phase
  if (gamePhase === 'saving') {
    const progressPercent = (totalSaved / goalAmount) * 100;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.weekTitle}>Semana {currentWeek} de {TOTAL_WEEKS}</Text>
            <Text style={styles.goalText}>Meta: {goalName} (${goalAmount})</Text>
          </View>
          <CoinDisplay coins={user.coins} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🐷 Tu Progreso</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            ${totalSaved.toFixed(2)} de ${goalAmount} ({progressPercent.toFixed(0)}%)
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💵 Esta Semana</Text>
          <Text style={styles.label}>Recibiste $10 de mesada</Text>
          <Text style={styles.label}>¿Cuánto quieres ahorrar?</Text>
          <TextInput
            style={styles.input}
            value={weeklySaving}
            onChangeText={setWeeklySaving}
            placeholder="Ejemplo: 5"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Puedes ahorrar de $0 a ${income}</Text>

          <Button title="Guardar en Alcancía" onPress={handleWeeklySaving} />
        </View>

        {weeksData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Semanas Anteriores</Text>
            {weeksData.map((week) => (
              <View key={week.week} style={styles.weekRow}>
                <Text style={styles.weekLabel}>Semana {week.week}:</Text>
                <Text style={styles.weekValue}>+${week.saved}</Text>
              </View>
            ))}
          </View>
        )}

        <Modal visible={showResultModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {weekResult && (
                <>
                  <Text style={styles.modalIcon}>🐷</Text>
                  <Text style={styles.modalTitle}>¡Bien Hecho!</Text>
                  <Text style={styles.modalDescription}>
                    Ahorraste ${weekResult.saved} esta semana
                  </Text>
                  <Text style={styles.totalSavedText}>
                    Total ahorrado: ${weekResult.totalSaved.toFixed(2)}
                  </Text>

                  {weekResult.totalSaved >= goalAmount ? (
                    <Text style={styles.achievedText}>🎉 ¡LOGRASTE TU META!</Text>
                  ) : (
                    <Text style={styles.remainingText}>
                      Te faltan: ${(goalAmount - weekResult.totalSaved).toFixed(2)}
                    </Text>
                  )}

                  <Button
                    title={weekResult.totalSaved >= goalAmount ? 'Ver Resumen' : 'Siguiente Semana'}
                    onPress={handleNextWeek}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // Summary Phase
  if (gamePhase === 'summary') {
    const { score, achieved, weeksNeeded, avgSavingRate } = calculateScore();

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.summaryTitle}>
          {achieved ? '🏆 ¡Meta Lograda!' : '💪 Buen Intento'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Resumen</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Meta:</Text>
            <Text style={styles.summaryValue}>{goalName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Precio:</Text>
            <Text style={styles.summaryValue}>${goalAmount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total ahorrado:</Text>
            <Text style={[styles.summaryValue, achieved ? styles.success : styles.warning]}>
              ${totalSaved.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Semanas usadas:</Text>
            <Text style={styles.summaryValue}>{weeksNeeded}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tasa de ahorro:</Text>
            <Text style={styles.summaryValue}>{avgSavingRate.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Puntuación: {score}/100</Text>
          <Text style={styles.scoreDescription}>
            {achieved
              ? '¡Excelente! Lograste tu meta ahorrando consistentemente.'
              : 'Buen intento. Intenta ahorrar más cada semana la próxima vez.'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Lo Que Aprendiste</Text>
          <Text style={styles.lesson}>• Ahorrar requiere disciplina y paciencia</Text>
          <Text style={styles.lesson}>• Pequeñas cantidades suman con el tiempo</Text>
          <Text style={styles.lesson}>• Tener una meta clara te motiva</Text>
          <Text style={styles.lesson}>• Ser constante es mejor que ahorrar mucho una vez</Text>
        </View>

        <Button
          title="Completar y Recibir Recompensas"
          onPress={handleComplete}
          loading={loading}
          size="large"
        />
        <Button title="Volver" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  weekTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  goalText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
  },
  introContainer: {
    alignItems: 'center',
  },
  introIcon: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  introTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  introSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  instruction: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tip: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  calculation: {
    backgroundColor: '#E3F2FD',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  calcText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: 20,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
  },
  progressText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  weekValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  totalSavedText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  achievedText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: Spacing.lg,
  },
  remainingText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  success: {
    color: Colors.success,
  },
  warning: {
    color: Colors.warning,
  },
  scoreDescription: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  lesson: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
});