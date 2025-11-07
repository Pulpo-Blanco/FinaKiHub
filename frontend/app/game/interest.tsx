import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { addCoins, addXP, updateProgress, unlockBadge, getProgress } from '../../utils/api';
import Button from '../../components/Button';
import CoinDisplay from '../../components/CoinDisplay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface YearData {
  year: number;
  balance: number;
  interest: number;
}

export default function InterestGame() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const updateCoins = useUserStore((state) => state.updateCoins);
  const updateXP = useUserStore((state) => state.updateXP);
  const addBadge = useUserStore((state) => state.addBadge);

  const [gamePhase, setGamePhase] = useState<'intro' | 'calculator' | 'comparison' | 'summary'>('intro');
  const [principal, setPrincipal] = useState('100');
  const [rate, setRate] = useState('5');
  const [years, setYears] = useState('5');
  const [simpleData, setSimpleData] = useState<YearData[]>([]);
  const [compoundData, setCompoundData] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateSimpleInterest = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseInt(years);

    if (!p || p <= 0 || !r || r <= 0 || !t || t <= 0 || t > 10) {
      Alert.alert('Error', 'Por favor ingresa valores válidos (años máximo 10)');
      return;
    }

    const yearlyData: YearData[] = [];
    for (let year = 1; year <= t; year++) {
      const interest = p * r * year;
      const balance = p + interest;
      yearlyData.push({ year, balance, interest });
    }

    setSimpleData(yearlyData);
    setGamePhase('calculator');
  };

  const showComparison = () => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseInt(years);

    const yearlyData: YearData[] = [];
    for (let year = 1; year <= t; year++) {
      const balance = p * Math.pow(1 + r, year);
      const interest = balance - p;
      yearlyData.push({ year, balance, interest });
    }

    setCompoundData(yearlyData);
    setGamePhase('comparison');
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const coinsEarned = 40;
      await addCoins(user.id, coinsEarned);
      updateCoins(user.coins + coinsEarned);

      const xpEarned = 80;
      const xpResult = await addXP(user.id, xpEarned);
      updateXP(xpResult.new_xp, xpResult.new_level);

      const currentProgress = await getProgress(user.id);
      const completedModules = currentProgress.completed_modules || [];

      if (!completedModules.includes('simple_interest')) {
        completedModules.push('simple_interest');
        await updateProgress({
          user_id: user.id,
          completed_modules: completedModules,
          module_scores: { ...currentProgress.module_scores, simple_interest: 100 },
          total_score: currentProgress.total_score + 100,
        });
      }

      if (xpResult.level_up) {
        Alert.alert('🎉 ¡SUBISTE DE NIVEL!', `¡Felicidades! Ahora eres nivel ${xpResult.new_level}\n\nBonificación: +${xpResult.bonus_coins} monedas`, [
          { text: 'Genial', onPress: () => showFinalAlert(coinsEarned, xpEarned) },
        ]);
      } else {
        showFinalAlert(coinsEarned, xpEarned);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar tu progreso.');
    } finally {
      setLoading(false);
    }
  };

  const showFinalAlert = (coins: number, xp: number) => {
    Alert.alert('¡Felicidades! 🎉', `Completaste Interés Simple.\n\n💰 Ganaste: ${coins} monedas\n⭐ XP ganado: ${xp}`, [
      { text: 'Ver Tienda', onPress: () => router.push('/(tabs)/shop') },
      { text: 'Volver', onPress: () => router.back() },
    ]);
  };

  if (!user) return null;

  if (gamePhase === 'intro') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.introContainer}>
          <Text style={styles.introIcon}>💰</Text>
          <Text style={styles.introTitle}>Interés Simple</Text>
          <Text style={styles.introSubtitle}>¡Descubre cómo crece tu dinero!</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 ¿Qué es el Interés?</Text>
            <Text style={styles.instruction}>El interés es dinero extra que ganas cuando guardas tu dinero en un banco.</Text>
            <Text style={styles.instruction}>Es como una recompensa por ahorrar.</Text>
            <Text style={styles.example}>📝 Ejemplo: Si guardas $100 y el banco te da 5% de interés anual, recibes $5 extra cada año.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Interés Simple</Text>
            <Text style={styles.instruction}>• El banco te paga sobre tu dinero original</Text>
            <Text style={styles.instruction}>• Ganas la misma cantidad cada año</Text>
            <Text style={styles.instruction}>• Es fácil de calcular</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Vamos a Aprender</Text>
            <Text style={styles.instruction}>1. Usarás una calculadora de intereses</Text>
            <Text style={styles.instruction}>2. Verás cómo crece tu dinero año por año</Text>
            <Text style={styles.instruction}>3. Compararás interés simple vs compuesto</Text>
          </View>

          <Button title="¡Comenzar!" onPress={() => setGamePhase('calculator')} size="large" />
        </View>
      </ScrollView>
    );
  }

  if (gamePhase === 'calculator') {
    const finalSimple = simpleData.length > 0 ? simpleData[simpleData.length - 1] : null;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🧮 Calculadora de Interés Simple</Text>
          <CoinDisplay coins={user.coins} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>💵 ¿Cuánto dinero quieres ahorrar?</Text>
          <TextInput style={styles.input} value={principal} onChangeText={setPrincipal} placeholder="100" keyboardType="decimal-pad" />

          <Text style={styles.label}>📈 Tasa de interés anual (%)</Text>
          <TextInput style={styles.input} value={rate} onChangeText={setRate} placeholder="5" keyboardType="decimal-pad" />

          <Text style={styles.label}>📅 ¿Por cuántos años?</Text>
          <TextInput style={styles.input} value={years} onChangeText={setYears} placeholder="5" keyboardType="number-pad" maxLength={2} />

          <Button title="Calcular" onPress={calculateSimpleInterest} />
        </View>

        {simpleData.length > 0 && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Crecimiento Año por Año</Text>
              {simpleData.map((data) => (
                <View key={data.year} style={styles.yearRow}>
                  <Text style={styles.yearLabel}>Año {data.year}:</Text>
                  <Text style={styles.yearInterest}>+${data.interest.toFixed(2)}</Text>
                  <Text style={styles.yearBalance}>${data.balance.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 Resumen</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Dinero inicial:</Text>
                <Text style={styles.summaryValue}>${principal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Interés ganado:</Text>
                <Text style={[styles.summaryValue, styles.success]}>${finalSimple?.interest.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total final:</Text>
                <Text style={[styles.summaryValue, styles.highlight]}>${finalSimple?.balance.toFixed(2)}</Text>
              </View>
            </View>

            <Button title="Ver Comparación con Interés Compuesto" onPress={showComparison} />
          </>
        )}
      </ScrollView>
    );
  }

  if (gamePhase === 'comparison') {
    const finalSimple = simpleData[simpleData.length - 1];
    const finalCompound = compoundData[compoundData.length - 1];
    const difference = finalCompound.balance - finalSimple.balance;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚖️ Simple vs Compuesto</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💡 Interés Compuesto</Text>
          <Text style={styles.instruction}>El interés compuesto es cuando ganas interés sobre tu interés.</Text>
          <Text style={styles.instruction}>Tu dinero crece más rápido porque el banco te paga sobre el total (dinero + interés anterior).</Text>
        </View>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonTitle}>Interés Simple</Text>
            <Text style={styles.comparisonAmount}>${finalSimple.balance.toFixed(2)}</Text>
            <Text style={styles.comparisonLabel}>Interés: ${finalSimple.interest.toFixed(2)}</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonTitle}>Interés Compuesto</Text>
            <Text style={[styles.comparisonAmount, styles.highlight]}>${finalCompound.balance.toFixed(2)}</Text>
            <Text style={styles.comparisonLabel}>Interés: ${finalCompound.interest.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 La Diferencia</Text>
          <Text style={styles.differenceText}>Con interés compuesto ganaste <Text style={styles.highlight}>${difference.toFixed(2)} MÁS</Text></Text>
          <Text style={styles.lesson}>💎 Por eso el interés compuesto es tan poderoso. Mientras más tiempo ahorres, ¡más crece tu dinero!</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📚 Lo Que Aprendiste</Text>
          <Text style={styles.lesson}>• El interés simple te paga sobre tu dinero original</Text>
          <Text style={styles.lesson}>• El interés compuesto te paga sobre el total</Text>
          <Text style={styles.lesson}>• Ahorrar por más tiempo = más interés</Text>
          <Text style={styles.lesson}>• El interés compuesto es tu mejor amigo</Text>
        </View>

        <Button title="Completar y Recibir Recompensas" onPress={handleComplete} loading={loading} size="large" />
        <Button title="Volver" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  label: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  introContainer: { alignItems: 'center' },
  introIcon: { fontSize: 80, marginBottom: Spacing.md },
  introTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  introSubtitle: { fontSize: FontSize.md, color: Colors.textLight, marginBottom: Spacing.xl, textAlign: 'center' },
  instruction: { fontSize: FontSize.md, color: Colors.text, marginBottom: Spacing.sm, lineHeight: 22 },
  example: { fontSize: FontSize.sm, color: Colors.accent, backgroundColor: '#E3F2FD', padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  yearLabel: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  yearInterest: { fontSize: FontSize.sm, color: Colors.success, marginRight: Spacing.md },
  yearBalance: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel: { fontSize: FontSize.md, color: Colors.text },
  summaryValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  success: { color: Colors.success },
  highlight: { color: Colors.primary, fontSize: FontSize.lg },
  comparisonCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  comparisonColumn: { alignItems: 'center', flex: 1 },
  comparisonTitle: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: Spacing.xs },
  comparisonAmount: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  comparisonLabel: { fontSize: FontSize.xs, color: Colors.textLight },
  vs: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textLight, marginHorizontal: Spacing.md },
  differenceText: { fontSize: FontSize.lg, color: Colors.text, textAlign: 'center', marginBottom: Spacing.md },
  lesson: { fontSize: FontSize.sm, color: Colors.text, marginBottom: Spacing.xs, lineHeight: 20 },
});