import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { HAMR_LEVELS, getHamrIntervalMs } from '../scoring';
import { colors } from '../theme';

type PlayerStatus = 'idle' | 'running' | 'done';

const BEEP = require('../../assets/sounds/beep.wav');
const BEEP_LEVEL = require('../../assets/sounds/beep-level.wav');

export function HamrPlayer() {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [display, setDisplay] = useState({ level: 1, shuttle: 1, total: 0 });
  const [levelFlash, setLevelFlash] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ levelIdx: 0, shuttle: 1, total: 0, active: false });
  const tickFnRef = useRef<() => void>(() => {});

  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const levelSoundRef = useRef<Audio.Sound | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  // Load sounds once and set audio mode for foreground playback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const beep = await Audio.Sound.createAsync(BEEP, { volume: 1.0 });
        const levelBeep = await Audio.Sound.createAsync(BEEP_LEVEL, { volume: 1.0 });
        if (mounted) {
          beepSoundRef.current = beep.sound;
          levelSoundRef.current = levelBeep.sound;
        } else {
          beep.sound.unloadAsync().catch(() => {});
          levelBeep.sound.unloadAsync().catch(() => {});
        }
      } catch {
        // Audio unavailable — silent fallback
      }
    })();
    return () => {
      mounted = false;
      beepSoundRef.current?.unloadAsync().catch(() => {});
      levelSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playBeep = async (isLevelEnd: boolean) => {
    const sound = isLevelEnd ? levelSoundRef.current : beepSoundRef.current;
    if (!sound) return;
    try {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      // ignore
    }
  };

  const triggerLevelFlash = () => {
    setLevelFlash(true);
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(flashAnim, { toValue: 0, duration: 1400, useNativeDriver: false }),
    ]).start(() => setLevelFlash(false));
  };

  tickFnRef.current = () => {
    const s = stateRef.current;
    if (!s.active) return;

    const lvl = HAMR_LEVELS[s.levelIdx];
    const shuttlesInLevel = lvl.end - lvl.start + 1;
    const isLevelEnd = s.shuttle >= shuttlesInLevel;

    playBeep(isLevelEnd);
    s.total++;

    if (isLevelEnd) {
      const next = s.levelIdx + 1;
      if (next >= HAMR_LEVELS.length) {
        s.active = false;
        setDisplay({ level: s.levelIdx + 1, shuttle: s.shuttle, total: s.total });
        setStatus('done');
        return;
      }
      s.levelIdx = next;
      s.shuttle = 1;
      triggerLevelFlash();
    } else {
      s.shuttle++;
    }

    setDisplay({ level: s.levelIdx + 1, shuttle: s.shuttle, total: s.total });

    const extra = isLevelEnd ? 1000 : 0;
    timerRef.current = setTimeout(tickFnRef.current, getHamrIntervalMs(s.levelIdx) + extra);
  };

  const start = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stateRef.current = { levelIdx: 0, shuttle: 1, total: 1, active: true };
    setDisplay({ level: 1, shuttle: 1, total: 1 });
    setStatus('running');
    playBeep(false);
    timerRef.current = setTimeout(tickFnRef.current, getHamrIntervalMs(0));
  };

  const stop = () => {
    stateRef.current.active = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle');
  };

  const reset = () => {
    stateRef.current.active = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    stateRef.current = { levelIdx: 0, shuttle: 1, total: 0, active: false };
    setDisplay({ level: 1, shuttle: 1, total: 0 });
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const totalShuttlesInLevel =
    status !== 'idle'
      ? HAMR_LEVELS[Math.min(display.level - 1, HAMR_LEVELS.length - 1)].end -
        HAMR_LEVELS[Math.min(display.level - 1, HAMR_LEVELS.length - 1)].start +
        1
      : 0;

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(10,49,97,0.25)', 'rgba(56,189,248,0.55)'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashBg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>HAMR Beep Timer</Text>
        {status === 'running' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {levelFlash && (
        <View style={styles.levelUpBanner}>
          <Text style={styles.levelUpText}>▲ LEVEL {display.level}</Text>
        </View>
      )}

      {(status === 'running' || status === 'done') && (
        <View style={styles.stats}>
          <View style={[styles.stat, levelFlash && styles.statHighlight]}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={[styles.statVal, levelFlash && styles.statValHighlight]}>
              {display.level}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Shuttle</Text>
            <Text style={styles.statVal}>
              {display.shuttle}
              {status === 'running' && (
                <Text style={styles.statSub}> / {totalShuttlesInLevel}</Text>
              )}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statVal}>{display.total}</Text>
          </View>
        </View>
      )}

      {status === 'done' && <Text style={styles.doneText}>All 15 levels complete!</Text>}

      <View style={styles.controls}>
        {status !== 'running' ? (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={styles.btnStartText}>
              {status === 'done' ? '↺ Restart' : '▶ Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop}>
            <Text style={styles.btnStopText}>■ Stop</Text>
          </TouchableOpacity>
        )}
        {status !== 'idle' && (
          <TouchableOpacity style={[styles.btn, styles.btnReset]} onPress={reset}>
            <Text style={styles.btnResetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>Single beep = run to far end · Triple beep = level up</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
    borderRadius: 10,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: colors.accentRed,
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  levelUpBanner: {
    backgroundColor: colors.accentBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  levelUpText: {
    color: colors.bgDark,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  statHighlight: {
    backgroundColor: 'rgba(56,189,248,0.25)',
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    lineHeight: 26,
  },
  statValHighlight: {
    color: colors.accentBlue,
  },
  statSub: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  doneText: {
    fontSize: 14,
    color: colors.statusPassLight,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnStart: {
    backgroundColor: colors.accentBlue,
  },
  btnStartText: {
    color: colors.bgDark,
    fontWeight: '600',
    fontSize: 15,
  },
  btnStop: {
    backgroundColor: colors.accentRed,
  },
  btnStopText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  btnReset: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    flex: 0,
    paddingHorizontal: 16,
  },
  btnResetText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
