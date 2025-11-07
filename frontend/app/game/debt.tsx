// app/game/primaria/DebtGame.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Animated, Easing, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackSource } from 'expo-av';

import { useUserStore } from '../../store/userStore';
import { addCoins, addXP, updateProgress, unlockBadge, getProgress } from '../../utils/api';
import Button from '../../components/Button';
import CoinDisplay from '../../components/CoinDisplay';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/Colors';

type Answer = 'borrow' | 'save' | 'ask';
interface Scenario {
  id: number; title: string; situation: string;
  borrowed: number; interestRate: number; months: number;
  question: string; correctAnswer: Answer; explanation: string;
}

const SCENARIOS: Scenario[] = [
  { id: 1, title: 'La Bicicleta Nueva',
    situation: 'Quieres una bicicleta que cuesta $100. Tu amigo te ofrece prestarte el dinero, pero debes devolverle $110 en 2 meses.',
    borrowed: 100, interestRate: 10, months: 2, question: '¿Qué deberías hacer?',
    correctAnswer: 'save',
    explanation: 'Es mejor ahorrar. Si pides prestado, pagas $10 extra (10% de interés). Ahorrando $50 por mes, en 2 meses tienes los $100 sin pagar extra.'
  },
  { id: 2, title: 'El Videojuego',
    situation: 'Sale un videojuego nuevo a $60. No tienes dinero, pero tu hermano te puede prestar $60 si le devuelves $65 la próxima semana.',
    borrowed: 60, interestRate: 8.3, months: 0.25, question: '¿Qué es mejor?',
    correctAnswer: 'save',
    explanation: 'Mejor esperar y ahorrar. Pedir prestado te cuesta $5 extra. Ese dinero lo podrías usar para otro juego o ahorrarlo.'
  },
  { id: 3, title: 'Regalo de Cumpleaños',
    situation: 'El cumpleaños de tu mejor amigo es mañana. Quieres comprarle un regalo de $20 pero no tienes dinero. Tu mamá te puede prestar.',
    borrowed: 20, interestRate: 0, months: 1, question: '¿Qué hacer?',
    correctAnswer: 'ask',
    explanation: 'Está bien pedir prestado a tu familia en emergencias (sin interés). Solo recuerda devolverlo cuando recibas tu mesada.'
  },
  { id: 4, title: 'Los Útiles Escolares',
    situation: 'Necesitas útiles escolares urgente ($30). La tienda ofrece "Compra ahora, paga después" pero terminarías pagando $40 en 3 meses.',
    borrowed: 30, interestRate: 33.3, months: 3, question: '¿Qué deberías hacer?',
    correctAnswer: 'ask',
    explanation: 'Para necesidades escolares, mejor pide ayuda a tus padres. El 33% es altísimo: evita “compra ahora, paga después” si puedes.'
  },
];

const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, '')}`;

// Fallback si tu Colors no tiene primaryDark
const PRIMARY_DARK = (Colors as any).primaryDark ?? '#2563eb';

export default function DebtGame() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateCoins = useUserStore((s) => s.updateCoins);
  const updateXP = useUserStore((s) => s.updateXP);
  const addBadge = useUserStore((s) => s.addBadge);

  const [phase, setPhase] = useState<'intro' | 'playing' | 'summary'>('intro');
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [loading, setLoading] = useState(false);

  // progreso animado
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: (idx / SCENARIOS.length) * 100,
      duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [idx]);

  // sonidos (evitamos ruido en Web)
  const correctS = useRef<Audio.Sound | null>(null);
  const wrongS = useRef<Audio.Sound | null>(null);
  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const c = new Audio.Sound();
          const w = new Audio.Sound();
          await c.loadAsync(require('../../assets/sounds/acierto.wav') as AVPlaybackSource);
          await w.loadAsync(require('../../assets/sounds/error.wav') as AVPlaybackSource);
          if (mounted) { correctS.current = c; wrongS.current = w; }
        } catch {}
      })();
    }
    return () => { correctS.current?.unloadAsync(); wrongS.current?.unloadAsync(); mounted = false; };
  }, []);

  // modal feedback
  const [modal, setModal] = useState<{open:boolean; ok:boolean; text:string}>({open:false, ok:false, text:''});
  const busyRef = useRef(false);

  const onAnswer = useCallback((a: Answer) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const s = SCENARIOS[idx];
    const ok = a === s.correctAnswer;

    if (ok) {
      setCorrect((p) => p + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
      correctS.current?.replayAsync().catch(()=>{});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(()=>{});
      wrongS.current?.replayAsync().catch(()=>{});
    }
    setModal({open:true, ok, text:s.explanation});
  }, [idx]);

  const onNext = useCallback(() => {
    setModal((m)=>({...m, open:false}));
    setTimeout(() => {
      if (idx < SCENARIOS.length - 1) setIdx((p)=>p+1);
      else setPhase('summary');
      busyRef.current = false;
    }, 120);
  }, [idx]);

  const score = useMemo(() => Math.round((correct / SCENARIOS.length) * 100), [correct]);
  const badge = useMemo(() => {
    if (score === 100) return {emoji:'🏆', msg:'¡Increíble! Todo perfecto 🎉'};
    if (score >= 50) return {emoji:'🥇', msg:'¡Buen trabajo! Sigue así 💪'};
    return {emoji:'😿', msg:'¡Sigue intentando! Puedes mejorar 🧠'};
  }, [score]);

  const handleComplete = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const coinsEarned = correct >= 3 ? 45 : 30;
      const xpEarned = 90;

      // Respuesta flexible del backend (new_total | coins | nada)
      const coinsRes = await addCoins(user.id, coinsEarned);
updateCoins(
  coinsRes?.new_total ?? (user.coins + coinsEarned)
);

      const xpRes = await addXP(user.id, xpEarned);
      updateXP(xpRes.new_xp, xpRes.new_level);

      const prog = await getProgress(user.id);
      const completed = prog.completed_modules || [];
      const module_scores = { ...(prog.module_scores || {}), debt_game: score };
      const total_score = (prog.total_score || 0) + score;

      if (!completed.includes('debt_game')) {
        completed.push('debt_game');
        await updateProgress({ user_id: user.id, completed_modules: completed, module_scores, total_score });
        if (completed.length === 4) { await unlockBadge(user.id, 'financial_wizard'); addBadge('financial_wizard'); }
      }

      setFinal({open:true, title:'¡Felicidades! 🎉',
        body:`Completaste Préstamos y Deudas.\n\n💰 Ganaste: ${coinsEarned} monedas\n⭐ XP ganado: ${xpEarned}`});
    } catch (e:any) {
      setFinal({open:true, title:'Error', body:'No se pudo guardar tu progreso. Revisa tu conexión o el backend.'});
      console.error('[DebtGame] save error:', e);
    } finally { setLoading(false); }
  }, [user, correct, score]);

  const [final, setFinal] = useState<{open:boolean; title:string; body:string}>({open:false, title:'', body:''});

  if (!user) return null;

  /* ---------- INTRO ---------- */
  if (phase === 'intro') {
    return (
      <View style={styles.flex1}>
        <Header>
          <Text style={styles.hTitle}>Préstamos y Deudas</Text>
          <Text style={styles.hSub}>Aprende a decidir: ¿Pedir, Ahorrar o Pedir Ayuda?</Text>
        </Header>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Card title="💡 ¿Qué es una Deuda?">
            <Text style={styles.p}>Es cuando pides dinero prestado y prometes devolverlo. Casi siempre pagas un extra llamado <Text style={styles.bold}>interés</Text>.</Text>
          </Card>
          <Card title="⚠️ Reglas Importantes">
            <Bullet>Solo pide si realmente lo necesitas</Bullet>
            <Bullet>Devuelve siempre lo que pides</Bullet>
            <Bullet>Calcula cuánto pagarás en total</Bullet>
            <Bullet error>Evita intereses altos y “compra ahora, paga después”</Bullet>
          </Card>
          <Card title="🎮 Cómo se juega">
            <Text style={styles.p}>Verás <Text style={styles.bold}>4 situaciones</Text>. Elige la mejor decisión. Ganas monedas y XP según tu resultado.</Text>
          </Card>
        </ScrollView>
        <Footer>
          <Button title="¡Comenzar!" size="large" onPress={()=>setPhase('playing')} />
        </Footer>
      </View>
    );
  }

  /* ---------- PLAYING ---------- */
  if (phase === 'playing') {
    const s = SCENARIOS[idx];
    const extra = s.borrowed * (s.interestRate/100);
    const total = s.borrowed + extra;
    const width = progress.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] });

    return (
      <View style={styles.flex1}>
        <Header compact>
          <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
            <Text style={styles.stepBadge}>{idx+1}</Text>
            <Text style={styles.hCompactTitle}>{s.title}</Text>
          </View>
          <CoinDisplay coins={user.coins} />
        </Header>

        <View style={styles.progressBar}><Animated.View style={[styles.progressFill,{width}]} /></View>

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Card title="📖 Situación"><Text style={styles.p}>{s.situation}</Text></Card>

          <Card title="💵 Los Números">
            <Row label="Dinero prestado" value={money(s.borrowed)} />
            <Row label="Interés" value={`${s.interestRate.toFixed(1)}%`} />
            <Row label="Debes pagar" value={money(total)} highlight />
            <Row label="Costo extra" value={money(extra)} warning />
          </Card>

          <Card title={`❓ ${s.question}`}>
            <View style={{gap:12}}>
              <Button title="💰 Pedir Prestado" variant="secondary" size="large" onPress={()=>onAnswer('borrow')} />
              <Button title="🐷 Ahorrar y Esperar" variant="primary" size="large" onPress={()=>onAnswer('save')} />
              <Button title="👨‍👩‍👧 Pedir Ayuda a Familia" variant="outline" size="large" onPress={()=>onAnswer('ask')} />
            </View>
          </Card>

          <SmallStat text={`Correctas: ${correct}/${idx+1}`} />
        </ScrollView>

        {/* Modal explicación */}
        <CenteredModal open={modal.open} onClose={onNext}>
          <Text style={[styles.modalTitle, modal.ok?styles.ok:styles.err]}>{modal.ok ? '✅ ¡Correcto!' : '❌ No es la mejor opción'}</Text>
          <Text style={styles.modalBody}>{modal.text}</Text>
          <Button title="Continuar" onPress={onNext} size="large" />
        </CenteredModal>
      </View>
    );
  }

  /* ---------- SUMMARY ---------- */
  if (phase === 'summary') {
    return (
      <View style={styles.flex1}>
        <Header>
          <Text style={styles.hTitle}>¡Completado!</Text>
        </Header>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Card title="📊 Tu resultado" elevated>
            <Text style={styles.center}>Respuestas correctas: {correct}/{SCENARIOS.length}</Text>
            <Text style={styles.center}>Puntuación: {score} /100</Text>
            <Text style={[styles.center, styles.badgeText]}>{badge.emoji} {badge.msg}</Text>
          </Card>

          <Card title="📚 Lecciones Clave">
            <Bullet>Pedir prestado cuesta dinero extra (interés)</Bullet>
            <Bullet>Ahorrar es mejor para “antojos”</Bullet>
            <Bullet>La familia suele prestar sin interés</Bullet>
            <Bullet>Solo endeúdate para necesidades</Bullet>
            <Bullet error>Evita deudas con interés alto</Bullet>
          </Card>

          <Card title="💡 Recuerda">
            <Text style={[styles.p, styles.center, {fontStyle:'italic'}]}>
              “Si no puedes pagar el interés, no pidas prestado. Ahorra y espera.”
            </Text>
          </Card>
        </ScrollView>

        <Footer>
          <Button title="Completar y Recibir Recompensas" onPress={handleComplete} loading={loading} size="large" />
          <Button title="Volver" onPress={()=>router.back()} variant="outline" />
        </Footer>

        {/* Modal final */}
        <CenteredModal open={final.open} onClose={()=>setFinal({...final, open:false})}>
          <Text style={[styles.modalTitle, styles.center]}>{final.title}</Text>
          <Text style={[styles.modalBody, styles.center]}>{final.body}</Text>
          <View style={{gap:12}}>
            <Button title="Ver Tienda" onPress={()=>{ setFinal({...final, open:false}); router.push('/(tabs)/shop'); }} />
            <Button title="Volver" variant="outline" onPress={()=>{ setFinal({...final, open:false}); router.back(); }} />
          </View>
        </CenteredModal>
      </View>
    );
  }

  return null;
}

/* ---------- Subcomponentes UI ---------- */

function Header({children, compact}:{children:React.ReactNode; compact?:boolean}) {
  return (
    <LinearGradient colors={[Colors.primary, PRIMARY_DARK]} start={{x:0,y:0}} end={{x:1,y:0}}
      style={[styles.header, compact && styles.headerCompact]}>
      <View style={[styles.headerInner, compact && styles.headerInnerCompact]}>{children}</View>
    </LinearGradient>
  );
}
function Footer({children}:{children:React.ReactNode}) {
  return <View style={styles.footer}>{children}</View>;
}
function Card({title, children, elevated}:{title:string; children:React.ReactNode; elevated?:boolean}) {
  return (
    <View style={[styles.card, elevated && styles.cardElevated]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{gap:8}}>{children}</View>
    </View>
  );
}
function Bullet({children, error}:{children:React.ReactNode; error?:boolean}) {
  return <Text style={[styles.bullet, error && styles.warning]}>{`• ${children as string}`}</Text>;
}
function Row({label, value, highlight, warning}:{label:string; value:string; highlight?:boolean; warning?:boolean}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlight, warning && styles.warning]}>{value}</Text>
    </View>
  );
}
function SmallStat({text}:{text:string}) {
  return (
    <View style={styles.smallStat}><Text style={styles.smallStatText}>{text}</Text></View>
  );
}
function CenteredModal({open, onClose, children}:{open:boolean; onClose:()=>void; children:React.ReactNode}) {
  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>{children}</View>
      </View>
    </Modal>
  );
}

/* ---------- Estilos ---------- */
const styles = StyleSheet.create({
  flex1:{flex:1},
  container:{flex:1, backgroundColor: Colors.background},
  content:{padding:Spacing.lg, paddingBottom:Spacing.xl*2},

  header:{paddingTop:Spacing.xl, paddingBottom:Spacing.lg},
  headerCompact:{paddingTop:Spacing.md, paddingBottom:Spacing.md},
  headerInner:{paddingHorizontal:Spacing.lg},
  headerInnerCompact:{flexDirection:'row', justifyContent:'space-between', alignItems:'center'},

  hTitle:{color:'#fff', fontSize:FontSize.xxl, fontWeight:'800'},
  hSub:{color:'#eaf2ff', marginTop:6},
  hCompactTitle:{color:'#fff', fontSize:FontSize.xl, fontWeight:'800'},
  stepBadge:{backgroundColor:'rgba(255,255,255,.2)', color:'#fff', paddingHorizontal:10, paddingVertical:2, borderRadius:999, fontWeight:'800'},

  progressBar:{height:8, marginHorizontal:Spacing.lg, marginTop:-12, backgroundColor:'rgba(255,255,255,.6)', borderRadius:999, overflow:'hidden'},
  progressFill:{height:'100%', backgroundColor:'#fff'},

  card:{
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl ?? 20,
    padding: Spacing.lg, marginHorizontal:Spacing.lg, marginTop:Spacing.md,
    shadowColor:'#000', shadowOpacity:0.08, shadowOffset:{width:0,height:4}, shadowRadius:10, elevation:3
  },
  cardElevated:{transform:[{translateY:-8}]},
  cardTitle:{fontSize:FontSize.lg, fontWeight:'800', color:Colors.text, marginBottom:Spacing.sm},

  p:{fontSize:FontSize.md, color:Colors.text, lineHeight:22},
  bold:{fontWeight:'700'},
  bullet:{fontSize:FontSize.sm, color:Colors.text, lineHeight:20},

  row:{flexDirection:'row', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.border},
  rowLabel:{color:Colors.textLight},
  rowValue:{fontWeight:'800', color:Colors.text},
  highlight:{color:Colors.primary},
  warning:{color: Colors.error},

  smallStat:{alignSelf:'center', marginTop:Spacing.sm, backgroundColor:Colors.white, paddingHorizontal:14, paddingVertical:8, borderRadius:999},
  smallStatText:{fontWeight:'700', color:Colors.text},

  footer:{
    padding:Spacing.lg, paddingTop:Spacing.md, backgroundColor:'#fff',
    borderTopWidth:1, borderTopColor:Colors.border,
    gap:12
  },

  modalBackdrop:{flex:1, backgroundColor:'rgba(0,0,0,.45)', justifyContent:'center', alignItems:'center', padding:Spacing.lg},
  modalCard:{width:'100%', maxWidth:520, backgroundColor:'#fff', borderRadius:20, padding:Spacing.lg, gap:12},
  modalTitle:{fontSize:FontSize.lg, fontWeight:'800'},
  ok:{color:'#16a34a'}, err:{color:'#dc2626'},
  modalBody:{fontSize:FontSize.md, color:Colors.text, lineHeight:22},
  center:{textAlign:'center'},
  badgeText:{marginTop:8, color:Colors.primary, fontWeight:'700'},
});
