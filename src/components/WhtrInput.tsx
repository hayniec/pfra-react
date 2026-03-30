import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { formatValue } from '../scoring';
import type { KeyThresholds } from '../types';
import { colors } from '../theme';

interface WhtrInputProps {
  onChange: (ratio: number) => void;
  thresholds?: KeyThresholds | null;
  score?: number;
}

function scoreColorClass(score: number, thresholds: KeyThresholds): string {
  if (score <= 0) return colors.textMuted;
  if (score >= thresholds.max.pts) return colors.highlightMax;
  if (score >= thresholds.good.pts) return colors.highlightGood;
  if (score >= thresholds.min.pts) return colors.highlightMin;
  return colors.accentRed;
}

function tierBorderColor(score: number, thresholds: KeyThresholds): string {
  if (score <= 0) return colors.inputBorder;
  if (score >= thresholds.max.pts) return colors.highlightMax;
  if (score >= thresholds.good.pts) return colors.highlightGood;
  if (score >= thresholds.min.pts) return colors.highlightMin;
  return colors.accentRed;
}

export function WhtrInput({ onChange, thresholds, score }: WhtrInputProps) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [heightRaw, setHeightRaw] = useState('');
  const [waistRaw, setWaistRaw] = useState('');
  const [touched, setTouched] = useState(false);

  const heightNum = parseFloat(heightRaw) || 0;
  const waistNum = parseFloat(waistRaw) || 0;
  const ratio = heightNum > 0 && waistNum > 0 ? waistNum / heightNum : 0;
  const hasValues = heightNum > 0 && waistNum > 0;
  const error =
    touched && hasValues && ratio >= 1.0 ? 'Waist must be less than height' : null;

  useEffect(() => {
    onChange(error ? 0 : ratio);
  }, [ratio, error]);

  const tiers = [
    { key: 'max', label: 'Max', color: colors.highlightMax, borderColor: colors.highlightMax },
    { key: 'good', label: 'Good', color: colors.highlightGood, borderColor: colors.highlightGood },
    { key: 'min', label: 'Pass', color: colors.highlightMin, borderColor: colors.highlightMin },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Waist-to-Height Ratio (20 PTS)</Text>
        <View style={styles.toggleGroup}>
          {(['in', 'cm'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.toggleBtn, unit === u && styles.toggleBtnActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.toggleText, unit === u && styles.toggleTextActive]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Height ({unit})</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={unit === 'in' ? 'e.g. 70' : 'e.g. 178'}
            placeholderTextColor={colors.textMuted}
            value={heightRaw}
            onChangeText={(t) => {
              setTouched(true);
              setHeightRaw(t);
            }}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Waist ({unit})</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={unit === 'in' ? 'e.g. 34' : 'e.g. 86'}
            placeholderTextColor={colors.textMuted}
            value={waistRaw}
            onChangeText={(t) => {
              setTouched(true);
              setWaistRaw(t);
            }}
          />
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {hasValues && !error && (
        <Text style={styles.ratioDisplay}>
          Ratio: <Text style={styles.ratioValue}>{ratio.toFixed(3)}</Text>
        </Text>
      )}

      {thresholds && (
        <View style={styles.thresholdRow}>
          {tiers.map(({ key, label, color, borderColor }) => {
            const data = thresholds[key];
            return (
              <View key={key} style={[styles.thresholdItem, { borderLeftColor: borderColor, borderLeftWidth: 2 }]}>
                <Text style={styles.thresholdLabel}>{label}</Text>
                <Text style={[styles.thresholdVal, { color }]}>
                  {'≤ '}{formatValue(data.val, 'whtr')}
                </Text>
                <Text style={styles.thresholdPts}>{data.pts} pts</Text>
              </View>
            );
          })}

          {score !== undefined && (
            <View
              style={[
                styles.thresholdItem,
                styles.thresholdItemYou,
                { borderLeftColor: tierBorderColor(score, thresholds), borderLeftWidth: 2 },
              ]}
            >
              <Text style={styles.thresholdLabel}>You</Text>
              <Text style={[styles.thresholdVal, { color: scoreColorClass(score, thresholds) }]}>
                {score > 0 ? `${score} pts` : '—'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
    flex: 1,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.accentBlue,
  },
  toggleText: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 13,
  },
  toggleTextActive: {
    color: colors.bgDark,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: { flex: 1 },
  inputLabel: {
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    color: colors.textMain,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: colors.accentRed,
    fontWeight: '500',
  },
  ratioDisplay: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 8,
  },
  ratioValue: {
    fontWeight: '700',
    color: colors.textMain,
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  thresholdItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  thresholdItemYou: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  thresholdLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  thresholdVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  thresholdPts: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
