import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import {
  addCoins,
  addXP,
  updateProgress,
  unlockBadge,
  getProgress,
} from '../../utils/api';
import Button from '../../components/Button';
import CoinDisplay from '../../components/CoinDisplay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type WeatherEvent = 'sunny' | 'rainy' | 'normal' | 'competition' | 'special_customer';

interface DayData {
  day: number;
  investment: number;
  revenue: number;
  profit: number;
  event: WeatherEvent;
  eventDescription: string;
  eventModifier: number;
}

const INITIAL_MONEY = 20;
const TOTAL_DAYS = 5;

export default function LemonadeGame() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const updateCoins = useUserStore((state) => state.updateCoins);
  const updateXP = useUserStore((state) => state.updateXP);
  const addBadge = useUserStore((state) => state.addBadge);

  // Game state
  const [currentDay, setCurrentDay] = useState(1);
  const [currentMoney, setCurrentMoney] = useState(INITIAL_MONEY);
  const [investment, setInvestment] = useState('');
  const [expectedSales, setExpectedSales] = useState('');
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [todayEvent, setTodayEvent] = useState<WeatherEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [dayResult, setDayResult] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [gamePhase, setGamePhase] = useState<'intro' | 'invest' | 'result' | 'summary'>('intro');

  useEffect(() => {
    if (currentDay <= TOTAL_DAYS && gamePhase === 'invest') {
      generateDailyEvent();
    }
  }, [currentDay, gamePhase]);

  const generateDailyEvent = () => {
    const random = Math.random();
    let event: WeatherEvent;
    
    if (currentDay === 1) {
      event = 'normal'; // Primer día siempre normal
    } else if (random < 0.2) {
      event = 'sunny';
    } else if (random < 0.35) {
      event = 'rainy';
    } else if (random < 0.5) {
      event = 'competition';
    } else if (random < 0.6) {
      event = 'special_customer';
    } else {
      event = 'normal';
    }

    setTodayEvent(event);
    setShowEventModal(true);
  };

  const getEventInfo = (event: WeatherEvent) => {
    switch (event) {
      case 'sunny':
        return {
          icon: '☀️',
          title: '¡Día Soleado!',
          description: 'Hace calor, la gente tiene sed. +20% en ventas',
          modifier: 1.2,
          color: '#FFA726',
        };
      case 'rainy':
        return {
          icon: '🌧️',
          title: 'Día Lluvioso',
          description: 'Está lloviendo, menos clientes. -30% en ventas',
          modifier: 0.7,
          color: '#42A5F5',
        };
      case 'competition':
        return {
          icon: '🏪',
          title: 'Competencia',
          description: 'Otro puesto abrió cerca. -15% en ventas',
          modifier: 0.85,
          color: '#EF5350',
        };
      case 'special_customer':
        return {
          icon: '⭐',
          title: 'Cliente Especial',
          description: '¡Un cliente compró mucho! +$10 extra',
          modifier: 1.0,
          bonus: 10,
          color: '#66BB6A',
        };
      default:
        return {
          icon: '🌤️',
          title: 'Día Normal',
          description: 'Un día típico para vender limonada',
          modifier: 1.0,
          color: '#78909C',
        };
    }
  };

  const handleDayInvestment = () => {
    const investAmount = parseFloat(investment);
    const expectedRevenue = parseFloat(expectedSales);

    if (!investAmount || investAmount <= 0) {
      Alert.alert('Error', 'Por favor ingresa cuánto quieres invertir');
      return;
    }

    if (investAmount > currentMoney) {
      Alert.alert('Error', `Solo tienes $${currentMoney.toFixed(2)} disponibles`);
      return;
    }

    if (!expectedRevenue || expectedRevenue <= 0) {
      Alert.alert('Error', 'Por favor ingresa cuánto esperas vender');
      return;
    }

    // Calculate actual sales with event modifier
    const eventInfo = getEventInfo(todayEvent!);
    let actualRevenue = expectedRevenue * eventInfo.modifier;
    
    if (eventInfo.bonus) {
      actualRevenue += eventInfo.bonus;
    }

    const profit = actualRevenue - investAmount;
    const newMoney = currentMoney - investAmount + actualRevenue;

    const dayData: DayData = {
      day: currentDay,
      investment: investAmount,
      revenue: actualRevenue,
      profit: profit,
      event: todayEvent!,
      eventDescription: eventInfo.description,
      eventModifier: eventInfo.modifier,
    };

    setDayResult(dayData);
    setDaysData([...daysData, dayData]);
    setCurrentMoney(newMoney);
    setShowResultModal(true);
  };

  const handleNextDay = () => {
    setShowResultModal(false);
    setDayResult(null);
    setInvestment('');
    setExpectedSales('');

    if (currentDay < TOTAL_DAYS) {
      setCurrentDay(currentDay + 1);
    } else {
      setGamePhase('summary');
    }
  };

  const calculateFinalScore = () => {
    const totalProfit = daysData.reduce((sum, day) => sum + day.profit, 0);
    const finalMoney = currentMoney;
    const profitMargin = ((finalMoney - INITIAL_MONEY) / INITIAL_MONEY) * 100;

    let score = 50; // Base score

    if (profitMargin >= 100) score = 100;
    else if (profitMargin >= 75) score = 90;
    else if (profitMargin >= 50) score = 80;
    else if (profitMargin >= 25) score = 70;
    else if (profitMargin >= 10) score = 60;

    return { totalProfit, finalMoney, profitMargin, score };
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { finalMoney, score } = calculateFinalScore();

      // Add coins (based on final money)
      const coinsEarned = Math.floor(finalMoney);
      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      // Add XP
      const xpEarned = 100;
      const xpResult = await addXP(user.id, xpEarned);
      updateXP(xpResult.new_xp, xpResult.new_level);

      // Update progress
      const currentProgress = await getProgress(user.id);
      const completedModules = currentProgress.completed_modules || [];

      if (!completedModules.includes('lemonade_stand')) {
        completedModules.push('lemonade_stand');

        await updateProgress({
          user_id: user.id,
          completed_modules: completedModules,
          module_scores: {
            ...currentProgress.module_scores,
            lemonade_stand: score,
          },
          total_score: currentProgress.total_score + score,
        });

        // Unlock badges
        if (completedModules.length === 1) {
          await unlockBadge(user.id, 'first_module');
          addBadge('first_module');
        }

        await unlockBadge(user.id, 'lemonade_master');
        addBadge('lemonade_master');
      }

      // Show level up if applicable
      if (xpResult.level_up) {
        Alert.alert(
          '🎉 ¡SUBISTE DE NIVEL!',
          `¡Felicidades! Ahora eres nivel ${xpResult.new_level}\n\nBonificación: +${xpResult.bonus_coins} monedas`,
          [
            {
              text: 'Genial',
              onPress: () => showFinalAlert(coinsEarned, xpEarned, xpResult.new_level),
            },
          ]
        );
      } else {
        showFinalAlert(coinsEarned, xpEarned, xpResult.new_level);
      }
    } catch (error) {
      console.error('Error completing game:', error);
      Alert.alert('Error', 'No se pudo guardar tu progreso. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const showFinalAlert = (coins: number, xp: number, level: number) => {
    Alert.alert(
      '¡Felicidades! 🎉',
      `Completaste el Puesto de Limonada.\n\n💰 Ganaste: ${coins} monedas\n⭐ XP ganado: ${xp}\n📊 Nivel actual: ${level}`,
      [
        {
          text: 'Ver Tienda',
          onPress: () => router.push('/(tabs)/shop'),
        },
        {
          text: 'Volver',
          onPress: () => router.back(),
        },
      ]
    );
  };

  if (!user) return null;

  // Intro Phase
  if (gamePhase === 'intro') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.introContainer}>
          <Text style={styles.introIcon}>🍋</Text>
          <Text style={styles.introTitle}>Puesto de Limonada</Text>
          <Text style={styles.introSubtitle}>¡Aprende sobre inversión y presupuesto!</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Instrucciones</Text>
            <Text style={styles.instruction}>
              🏪 Tienes <Text style={styles.bold}>${INITIAL_MONEY}</Text> para iniciar tu negocio
            </Text>
            <Text style={styles.instruction}>
              📅 El juego dura <Text style={styles.bold}>{TOTAL_DAYS} días</Text>
            </Text>
            <Text style={styles.instruction}>
              💡 Cada día decides cuánto invertir en ingredientes
            </Text>
            <Text style={styles.instruction}>
              🌦️ El clima y eventos afectan tus ventas
            </Text>
            <Text style={styles.instruction}>
              💰 Tu objetivo: ¡Ganar el mayor dinero posible!
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎲 Eventos Posibles</Text>
            <Text style={styles.eventItem}>☀️ Día soleado: +20% ventas</Text>
            <Text style={styles.eventItem}>🌧️ Día lluvioso: -30% ventas</Text>
            <Text style={styles.eventItem}>🏪 Competencia: -15% ventas</Text>
            <Text style={styles.eventItem}>⭐ Cliente especial: +$10 extra</Text>
          </View>

          <Button
            title="¡Comenzar Negocio!"
            onPress={() => setGamePhase('invest')}
            size="large"
          />
        </View>
      </ScrollView>
    );
  }

  // Investment Phase
  if (gamePhase === 'invest') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.dayTitle}>Día {currentDay} de {TOTAL_DAYS}</Text>
            <Text style={styles.moneyText}>Dinero: ${currentMoney.toFixed(2)}</Text>
          </View>
          <CoinDisplay coins={user.coins} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💵 Inversión del Día</Text>
          
          <Text style={styles.label}>¿Cuánto quieres invertir en ingredientes?</Text>
          <TextInput
            style={styles.input}
            value={investment}
            onChangeText={setInvestment}
            placeholder="Ejemplo: 5"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Disponible: ${currentMoney.toFixed(2)}</Text>

          <Text style={styles.label}>¿Cuánto esperas vender hoy?</Text>
          <TextInput
            style={styles.input}
            value={expectedSales}
            onChangeText={setExpectedSales}
            placeholder="Ejemplo: 15"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>
            💡 Tip: Intenta vender más de lo que inviertes para ganar
          </Text>

          <Button title="Vender Limonada" onPress={handleDayInvestment} />
        </View>

        {daysData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Días Anteriores</Text>
            {daysData.map((day) => (
              <View key={day.day} style={styles.dayRow}>
                <Text style={styles.dayLabel}>Día {day.day}:</Text>
                <Text style={[styles.dayProfit, day.profit > 0 ? styles.profit : styles.loss]}>
                  {day.profit > 0 ? '+' : ''}${day.profit.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Event Modal */}
        <Modal visible={showEventModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {todayEvent && (
                <>
                  <Text style={styles.modalIcon}>{getEventInfo(todayEvent).icon}</Text>
                  <Text style={styles.modalTitle}>{getEventInfo(todayEvent).title}</Text>
                  <Text style={styles.modalDescription}>
                    {getEventInfo(todayEvent).description}
                  </Text>
                  <Button
                    title="Entendido"
                    onPress={() => setShowEventModal(false)}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Result Modal */}
        <Modal visible={showResultModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {dayResult && (
                <>
                  <Text style={styles.modalIcon}>
                    {dayResult.profit > 0 ? '🎉' : '😔'}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {dayResult.profit > 0 ? '¡Buen trabajo!' : 'Ups...'}
                  </Text>
                  
                  <View style={styles.resultDetails}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Invertiste:</Text>
                      <Text style={styles.resultValue}>-${dayResult.investment.toFixed(2)}</Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Vendiste:</Text>
                      <Text style={styles.resultValue}>+${dayResult.revenue.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.resultRow, styles.resultTotal]}>
                      <Text style={styles.resultLabel}>Ganancia:</Text>
                      <Text style={[styles.resultValue, dayResult.profit > 0 ? styles.profit : styles.loss]}>
                        {dayResult.profit > 0 ? '+' : ''}${dayResult.profit.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.newMoneyText}>
                    Dinero total: ${currentMoney.toFixed(2)}
                  </Text>

                  <Button
                    title={currentDay < TOTAL_DAYS ? 'Siguiente Día' : 'Ver Resumen'}
                    onPress={handleNextDay}
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
    const { totalProfit, finalMoney, profitMargin, score } = calculateFinalScore();

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.summaryTitle}>🏆 Resumen Final</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Resultados</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dinero inicial:</Text>
            <Text style={styles.summaryValue}>${INITIAL_MONEY}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dinero final:</Text>
            <Text style={styles.summaryValue}>${finalMoney.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ganancia total:</Text>
            <Text style={[styles.summaryValue, styles.profit]}>
              +${totalProfit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Margen de ganancia:</Text>
            <Text style={[styles.summaryValue, styles.profit]}>
              {profitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Desglose por Día</Text>
          {daysData.map((day) => (
            <View key={day.day} style={styles.dayDetailRow}>
              <Text style={styles.dayDetailLabel}>
                Día {day.day} {getEventInfo(day.event).icon}
              </Text>
              <Text style={[styles.dayDetailValue, day.profit > 0 ? styles.profit : styles.loss]}>
                {day.profit > 0 ? '+' : ''}${day.profit.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Puntuación: {score}/100</Text>
          <Text style={styles.scoreDescription}>
            {score >= 90
              ? '¡Excelente! Eres un maestro de los negocios'
              : score >= 70
              ? '¡Muy bien! Manejas bien tu negocio'
              : score >= 50
              ? 'Buen trabajo, sigue practicando'
              : 'Intenta invertir mejor la próxima vez'}
          </Text>
        </View>

        <Button
          title="Completar y Recibir Recompensas"
          onPress={handleComplete}
          loading={loading}
          size="large"
        />

        <Button
          title="Volver"
          onPress={() => router.back()}
          variant="outline"
        />
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
  dayTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  moneyText: {
    fontSize: FontSize.md,
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
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  dayProfit: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  profit: {
    color: Colors.success,
  },
  loss: {
    color: Colors.error,
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
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  eventItem: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.xs,
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
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultDetails: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultTotal: {
    borderTopWidth: 2,
    borderTopColor: Colors.text,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  resultLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  resultValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  newMoneyText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
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
  dayDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  dayDetailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  dayDetailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  scoreDescription: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
