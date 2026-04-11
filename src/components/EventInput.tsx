import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { TIME_BASED_EVENTS, validateEvent, formatValue, HAMR_LEVELS } from '../scoring';
import type { KeyThresholds } from '../types';
import { colors } from '../theme';

export interface EventOption {
  value: string;
  label: string;
}

interface EventInputProps {
  sectionLabel: string;
  maxPts: number;
  options?: EventOption[];
  selectedType: string;
  onTypeChange?: (type: string) => void;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  thresholds?: KeyThresholds | null;
  valueType?: string;
  score?: number;
  walkPassFail?: { threshold: number; passed: boolean | null } | null;
  hamrLevel?: { level: number; shuttle: number; totalInLevel: number } | null;
  paceInfo?: { perMile: string } | null;
  locked?: boolean;
  onToggleLock?: () => void;
}

function TimeInput({
  value,
  onChange,
  onTouch,
}: {
  value: number;
  onChange: (v: number) => void;
  onTouch: () => void;
}) {
  const mins = Math.floor(value / 60);
  const secs = value % 60;

  return (
    <View style={styles.timeGroup}>
      <TextInput
        style={[styles.input, styles.timeInput]}
        keyboardType="number-pad"
        value={mins > 0 ? String(mins) : ''}
        placeholder="MM"
        placeholderTextColor={colors.textMuted}
        onChangeText={(t) => {
          onTouch();
          onChange(Math.max(0, Number(t) || 0) * 60 + secs);
        }}
      />
      <Text style={styles.timeSep}>:</Text>
      <TextInput
        style={[styles.input, styles.timeInput]}
        keyboardType="number-pad"
        value={secs > 0 || mins > 0 ? String(secs).padStart(2, '0') : ''}
        placeholder="SS"
        placeholderTextColor={colors.textMuted}
        onChangeText={(t) => {
          onTouch();
          onChange(mins * 60 + Math.min(59, Math.max(0, Number(t) || 0)));
        }}
      />
    </View>
  );
}

function scoreColor(score: number, thresholds: KeyThresholds): string {
  if (score <= 0) return colors.textMuted;
  if (score >= thresholds.max.pts) return colors.highlightMax;
  if (score >= thresholds.good.pts) return colors.highlightGood;
  if (score >= thresholds.min.pts) return colors.highlightMin;
  return colors.accentRed;
}

function tierBorder(score: number, thresholds: KeyThresholds): string {
  if (score <= 0) return colors.inputBorder;
  if (score >= thresholds.max.pts) return colors.highlightMax;
  if (score >= thresholds.good.pts) return colors.highlightGood;
  if (score >= thresholds.min.pts) return colors.highlightMin;
  return colors.accentRed;
}

export function EventInput({
  sectionLabel,
  maxPts,
  options,
  selectedType,
  onTypeChange,
  value,
  onChange,
  placeholder,
  thresholds,
  valueType,
  score,
  walkPassFail,
  hamrLevel,
  paceInfo,
  locked,
  onToggleLock,
}: EventInputProps) {
  const [touched, setTouched] = useState(false);
  const [rawInput, setRawInput] = useState(() => (value > 0 ? String(value) : ''));
  const timeBased = TIME_BASED_EVENTS.includes(selectedType);
  const error = touched ? validateEvent(selectedType, value) : null;

  const tiers = [
    { key: 'max' as const, label: 'Max', color: colors.highlightMax, borderColor: colors.highlightMax },
    { key: 'good' as const, label: 'Good', color: colors.highlightGood, borderColor: colors.highlightGood },
    { key: 'min' as const, label: 'Pass', color: colors.highlightMin, borderColor: colors.highlightMin },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {sectionLabel} ({maxPts} PTS)
        </Text>
        {onToggleLock && (
          <TouchableOpacity
            style={[styles.lockBtn, locked && styles.lockBtnActive]}
            onPress={onToggleLock}
            accessibilityLabel={locked ? 'Unlock score' : 'Lock score'}
          >
            <Text style={[styles.lockBtnText, locked && styles.lockBtnTextActive]}>
              {locked ? '🔒 Locked' : '🔒 Lock'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {options && options.length > 1 && (
        <View style={styles.toggleGroup}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.toggleBtn, selectedType === opt.value && styles.toggleBtnActive]}
              onPress={() => onTypeChange?.(opt.value)}
            >
              <Text
                style={[styles.toggleText, selectedType === opt.value && styles.toggleTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {timeBased ? (
        <TimeInput value={value} onChange={onChange} onTouch={() => setTouched(true)} />
      ) : (
        <TextInput
          style={styles.input}
          keyboardType={selectedType === 'whtr' ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder ?? 'Enter value'}
          placeholderTextColor={colors.textMuted}
          value={rawInput}
          onChangeText={(t) => {
            setTouched(true);
            setRawInput(t);
            const num = Number(t);
            onChange(isNaN(num) ? 0 : num);
          }}
          onBlur={() => setTouched(true)}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {thresholds && valueType && (
        <View style={styles.thresholdRow}>
          {tiers.map(({ key, label, color, borderColor }) => {
            const data = thresholds[key];
            return (
              <View key={key} style={[styles.thresholdItem, { borderLeftColor: borderColor, borderLeftWidth: 2 }]}>
                <Text style={styles.thresholdLabel}>{label}</Text>
                <Text style={[styles.thresholdVal, { color }]}>
                  {thresholds.isLowerBetter ? '≤' : '≥'} {formatValue(data.val, valueType)}
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
                { borderLeftColor: tierBorder(score, thresholds), borderLeftWidth: 2 },
              ]}
            >
              <Text style={styles.thresholdLabel}>You</Text>
              <Text style={[styles.thresholdVal, { color: scoreColor(score, thresholds) }]}>
                {score > 0 ? `${score} pts` : '—'}
              </Text>
            </View>
          )}
        </View>
      )}

      {walkPassFail && (
        <View style={styles.thresholdRow}>
          <View style={[styles.thresholdItem, { borderLeftColor: colors.highlightMin, borderLeftWidth: 2 }]}>
            <Text style={styles.thresholdLabel}>Pass</Text>
            <Text style={[styles.thresholdVal, { color: colors.highlightMin }]}>
              {'≤ '}{formatValue(walkPassFail.threshold, 'walk')}
            </Text>
          </View>
          <View
            style={[
              styles.thresholdItem,
              styles.thresholdItemYou,
              {
                borderLeftColor:
                  walkPassFail.passed === null
                    ? colors.inputBorder
                    : walkPassFail.passed
                    ? colors.highlightMax
                    : colors.accentRed,
                borderLeftWidth: 2,
              },
            ]}
          >
            <Text style={styles.thresholdLabel}>You</Text>
            <Text
              style={[
                styles.thresholdVal,
                {
                  color:
                    walkPassFail.passed === null
                      ? colors.textMuted
                      : walkPassFail.passed
                      ? colors.highlightMax
                      : colors.accentRed,
                },
              ]}
            >
              {walkPassFail.passed === null ? '—' : walkPassFail.passed ? 'PASS' : 'FAIL'}
            </Text>
          </View>
        </View>
      )}

      {hamrLevel && (
        <View style={styles.hamrBadge}>
          <Text style={styles.hamrLabel}>HAMR Level</Text>
          <Text style={styles.hamrValue}>
            {hamrLevel.level <= HAMR_LEVELS.length
              ? `${hamrLevel.level} — Shuttle ${hamrLevel.shuttle} / ${hamrLevel.totalInLevel}`
              : `${hamrLevel.level}+`}
          </Text>
        </View>
      )}

      {paceInfo && (
        <View style={styles.paceRow}>
          <Text style={styles.paceLabel}>Pace</Text>
          <Text style={styles.paceValue}>
            {paceInfo.perMile}
            <Text style={styles.paceUnit}>/mi</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
    flex: 1,
  },
  lockBtn: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  lockBtnActive: {
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderColor: colors.accentBlue,
  },
  lockBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  lockBtnTextActive: {
    color: colors.accentBlue,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
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
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    flex: 1,
    textAlign: 'center',
  },
  timeSep: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textMuted,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    color: colors.accentRed,
    fontWeight: '500',
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
  hamrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  hamrLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hamrValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentBlue,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  paceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
  },
  paceUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
