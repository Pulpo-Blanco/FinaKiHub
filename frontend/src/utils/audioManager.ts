// src/utils/audioManager.ts
import { Audio } from 'expo-av';

type Key = 'correct' | 'wrong' | 'complete';
type SoundMap = Partial<Record<Key, Audio.Sound>>;

let cache: SoundMap = {};
let isReady = false;
let isMuted = false;

export async function initAudio(sources: { correct: any; wrong: any; complete: any }) {
  if (isReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      // ⚠️ quitamos interruptionModeAndroid/IOS porque tu tipo de Audio no las tiene
    });
  } catch {}
  for (const k of Object.keys(sources) as Key[]) {
    const { sound } = await Audio.Sound.createAsync(sources[k], { shouldPlay: false });
    cache[k] = sound;
  }
  isReady = true;
}

export function setMuted(muted: boolean) { isMuted = muted; }

export async function play(key: Key) {
  if (!isReady || isMuted) return;
  const s = cache[key];
  try { await s?.replayAsync(); } catch {}
}

export async function unloadAll() {
  await Promise.all(Object.values(cache).map(s => s?.unloadAsync().catch(() => {})));
  cache = {};
  isReady = false;
}
