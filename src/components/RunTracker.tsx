import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../theme';

const TARGET_MILES = 2.0;

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Status = 'idle' | 'acquiring' | 'running' | 'done' | 'error';

export function RunTracker({ onComplete }: { onComplete: (seconds: number) => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const timerStartedRef = useRef(false);
  const activeRef = useRef(false);
  const totalDistRef = useRef(0);
  const lastPosRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const cleanup = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setErrorMsg('Location permission denied. Enable GPS in your device settings.');
      setStatus('error');
      return;
    }

    cleanup();
    activeRef.current = true;
    timerStartedRef.current = false;
    totalDistRef.current = 0;
    lastPosRef.current = null;
    startTimeRef.current = 0;
    setDistance(0);
    setElapsed(0);
    setErrorMsg(null);
    setStatus('acquiring');

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        if (!activeRef.current) return;

        const { latitude: lat, longitude: lon, accuracy } = loc.coords;
        const now = Date.now();

        if (!timerStartedRef.current) {
          timerStartedRef.current = true;
          startTimeRef.current = now;
          setStatus('running');
          timerRef.current = setInterval(() => {
            setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
          }, 1000);
        }

        if (accuracy && accuracy > 30) return;

        if (lastPosRef.current) {
          const dist = haversine(lastPosRef.current.lat, lastPosRef.current.lon, lat, lon);
          const hrs = (now - lastPosRef.current.time) / 3_600_000;
          const mph = hrs > 0 ? dist / hrs : 0;

          if (mph <= 20) {
            totalDistRef.current += dist;
            const newDist = totalDistRef.current;
            setDistance(newDist);

            if (newDist >= TARGET_MILES) {
              activeRef.current = false;
              const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
              cleanup();
              setElapsed(secs);
              setDistance(TARGET_MILES);
              setStatus('done');
              onCompleteRef.current(secs);
              return;
            }
          }
        }

        lastPosRef.current = { lat, lon, time: now };
      }
    );
  };

  const stop = () => {
    activeRef.current = false;
    cleanup();
    setStatus('idle');
  };

  useEffect(() => () => cleanup(), []);

  const progress = Math.min(distance / TARGET_MILES, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GPS Run Tracker</Text>
        {status === 'running' && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {status !== 'idle' && status !== 'error' && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>miles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{fmtTime(elapsed)}</Text>
            <Text style={styles.statLabel}>time</Text>
          </View>
        </View>
      )}

      {(status === 'running' || status === 'done') && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
      )}

      {status === 'acquiring' && (
        <Text style={styles.note}>Acquiring GPS signal — move outside for best accuracy...</Text>
      )}
      {status === 'done' && (
        <Text style={styles.doneText}>2 miles reached — time filled above!</Text>
      )}
      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <View style={styles.controls}>
        {status === 'running' || status === 'acquiring' ? (
          <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop}>
            <Text style={styles.btnStopText}>■ Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={styles.btnStartText}>
              {status === 'done' ? '↺ New Run' : '▶ Start Run'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>Keep screen on · Auto-stops at 2.0 miles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
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
  stats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 10,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statVal: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textMain,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.inputBorder,
    borderRadius: 99,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentBlue,
    borderRadius: 99,
  },
  progressPct: {
    position: 'absolute',
    right: 0,
    top: -18,
    fontSize: 11,
    color: colors.textMuted,
  },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: 6,
  },
  doneText: {
    fontSize: 13,
    color: colors.passGreen,
    fontWeight: '600',
    marginVertical: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.accentRed,
    marginVertical: 6,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
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
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});
