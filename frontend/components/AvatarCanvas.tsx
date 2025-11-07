import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { useUserStore } from '../store/userStore';
import { Colors, BorderRadius } from '../constants/Colors';

type Gender = 'niño' | 'niña' | 'male' | 'female';

type LiteItem = {
  id: string;
  category: string;          // 'hat' | 'sombrero' | 'accessory' | 'accesorio' | 'background' | 'fondo' | 'special' | 'especiales'
  name?: string;
  price?: number;
  icon?: string;
  image_url?: string;        // URL de PNG transparente (opcional)
};

// Solo defaults locales (rápidos, offline)
const LOCAL_ASSETS = {
  bases: {
    niño: require('../assets/avatar/base_nino.png'),
    niña: require('../assets/avatar/base_nina.png'),
  },
  fondos: {
    atardecer: require('../assets/avatar/fondos/atardecer.png'),
    bosque: require('../assets/avatar/fondos/bosque.png'),
  },
  // Algunos accesorios de ejemplo como fallback
  sombreros: {
    'corona-real': require('../assets/avatar/corona_real.png'),
    'sombrero-mago': require('../assets/avatar/sombrero_mago.png'),
  },
  accesorios: {
    'lentes-cool': require('../assets/avatar/lentes_cool.png'),
  },
  especiales: {
    medalla: require('../assets/avatar/medalla.png'),
  },
} as const;

const LAYOUT = {
  canvas:   { width: 320, height: 200 },
  fondo:    { top: 0, left: 0, width: 320, height: 200 },
  base:     { top: 34, left: 110, width: 100, height: 100 },
  sombrero: { top: -2, left: 120, width: 90, height: 70 },
  lentes:   { top: 68, left: 144, width: 52, height: 22 },
  especial: { top: 95, left: 210, width: 40, height: 40 },
};

type Props = {
  width?: number;
  framed?: boolean;
  gender?: Gender;
  /** Lista completa de shop items para buscar image_url por id */
  items?: LiteItem[];
};

export default function AvatarCanvas({ width = 980, framed = true, gender, items }: Props) {
  const user = useUserStore((s) => s.user);

  // Acepta español/inglés desde backend
  const eqRaw: any = user?.equipped_items ?? {};
  const eq = {
    sombrero:   eqRaw.sombrero   || eqRaw.hat,
    accesorio:  eqRaw.accesorio  || eqRaw.accessory,
    fondo:      eqRaw.fondo      || eqRaw.background,
    especiales: eqRaw.especiales || eqRaw.special,
  };

  const fondoId     = norm(eq.fondo) || 'atardecer';
  const sombreroId  = norm(eq.sombrero);
  const accesorioId = norm(eq.accesorio);
  const especialId  = norm(eq.especiales);

  const userGender = (user as any)?.gender as Gender | undefined;
  const g = gender || userGender || 'niño';
  const gKey = g === 'female' ? 'niña' : g === 'male' ? 'niño' : (g as 'niño' | 'niña');

  const k = width / LAYOUT.canvas.width;
  const height = LAYOUT.canvas.height * k;

  // ====== RESOLUCIÓN HÍBRIDA (URL -> fallback local) ======
  const findItem = (id?: string | null) =>
    (id && items) ? items.find(i => i.id === id) : undefined;

  const srcFondo: ImageSourcePropType =
    findItem(fondoId)?.image_url
      ? { uri: findItem(fondoId)!.image_url }
      : (LOCAL_ASSETS.fondos as any)[fondoId] ?? LOCAL_ASSETS.fondos.atardecer;

  const srcBase: ImageSourcePropType = (LOCAL_ASSETS.bases as any)[gKey];

  const srcSombrero: ImageSourcePropType | null =
    sombreroId && findItem(sombreroId)?.image_url
      ? { uri: findItem(sombreroId)!.image_url }
      : sombreroId
      ? (LOCAL_ASSETS.sombreros as any)[sombreroId]
      : null;

  const srcLentes: ImageSourcePropType | null =
    accesorioId && findItem(accesorioId)?.image_url
      ? { uri: findItem(accesorioId)!.image_url }
      : accesorioId
      ? (LOCAL_ASSETS.accesorios as any)[accesorioId]
      : null;

  const srcEspecial: ImageSourcePropType | null =
    especialId && findItem(especialId)?.image_url
      ? { uri: findItem(especialId)!.image_url }
      : especialId
      ? (LOCAL_ASSETS.especiales as any)[especialId]
      : null;

  return (
    <View style={[{ width, height }, framed && styles.frame]}>
      <Image source={srcFondo}   resizeMode="cover"   style={scaled(LAYOUT.fondo, k)} />
      <Image source={srcBase}    resizeMode="contain" style={scaled(LAYOUT.base, k)} />
      {srcSombrero && <Image source={srcSombrero} resizeMode="contain" style={scaled(LAYOUT.sombrero, k)} />}
      {srcLentes   && <Image source={srcLentes}   resizeMode="contain" style={scaled(LAYOUT.lentes, k)} />}
      {srcEspecial && <Image source={srcEspecial} resizeMode="contain" style={scaled(LAYOUT.especial, k)} />}
    </View>
  );
}

// helpers
function scaled(r: { top: number; left: number; width: number; height: number }, k: number) {
  return {
    position: 'absolute' as const,
    top: r.top * k,
    left: r.left * k,
    width: r.width * k,
    height: r.height * k,
    borderRadius: r === LAYOUT.fondo ? BorderRadius.lg : 0,
  };
}
function norm(id?: string | null) {
  if (!id) return '';
  return String(id).trim().toLowerCase().replace(/\s+/g, '-');
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#e6eef6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
});
