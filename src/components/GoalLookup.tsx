import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import rawScoringData from '../scoringData.json';
import type { ScoringTable } from '../types';
import { TABLE_MAP, formatValue, getValueForScore, getWalkThreshold } from '../scoring';
import { colors } from '../theme';

const TABLES = rawScoringData as ScoringTable[];
const getTable = (id: number) => TABLES.find((t) => t.id === id) ?? null;

const TIERS = [
  { label: 'Pass', score: 75 },
  { label: 'Good', score: 80 },
  { label: 'Excellent', score: 90 },
  { label: 'Max', score: 100 },
] as const;

const EVENT_MAX = { whtr: 20, cardio: 50, strength: 15, core: 15 } as const;
const MAX_OTHERS = EVENT_MAX.cardio + EVENT_MAX.strength + EVENT_MAX.core;

function distributeRemaining(
  remaining: number
): { cardio: number; strength: number; core: number } | null {
  if (remaining > MAX_OTHERS) return null;
  if (remaining <= 0) return { cardio: 0, strength: 0, core: 0 };

  const keys = ['cardio', 'strength', 'core'] as const;
  const maxes = { cardio: EVENT_MAX.cardio, strength: EVENT_MAX.strength, core: EVENT_MAX.core };
  const exact = keys.map((k) => (maxes[k] / MAX_OTHERS) * remaining);
  const floors = exact.map((v) => Math.floor(v));
  const deficit = remaining - floors.reduce((s, v) => s + v, 0);
  const rems = exact.map((v, i) => ({ i, r: v - floors[i] }));
  rems.sort((a, b) => b.r - a.r);
  rems.slice(0, deficit).forEach(({ i }) => {
    floors[i]++;
  });
  return { cardio: floors[0], strength: floors[1], core: floors[2] };
}

interface GoalLookupProps {
  colIdx: number;
  ageGroup: string;
  gender: string;
  cardioType: string;
  strengthType: string;
  coreType: string;
  whtrScore: number;
}

export function GoalLookup({
  colIdx,
  ageGroup,
  gender,
  cardioType,
  strengthType,
  coreType,
  whtrScore,
}: GoalLookupProps) {
  const [selectedTier, setSelectedTier] = useState(75);

  const cardioLabel: Record<string, string> = {
    run: '2-Mile Run',
    hamr: '20m HAMR',
    walk: '1.2mi Walk',
  };
  const strengthLabel: Record<string, string> = {
    pushup: 'Push-ups',
    handrelease: 'HR Push-ups',
  };
  const coreLabel: Record<string, string> = {
    situp: 'Sit-ups',
    crunches: 'Cross-Leg Crunches',
    plank: 'Plank',
  };

  const remaining = selectedTier - whtrScore;
  const dist = distributeRemaining(remaining);
  const impossible = dist === null;

  const cardioPts = dist?.cardio ?? 0;
  const strengthPts = dist?.strength ?? 0;
  const corePts = dist?.core ?? 0;
  const totalPts =
    whtrScore + (cardioType === 'walk' ? 0 : cardioPts) + strengthPts + corePts;

  const cardioVal =
    !impossible &&
    cardioType !== 'walk' &&
    getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP])
      ? getValueForScore(
          getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP])!,
          colIdx,
          cardioPts
        )
      : null;
  const strengthVal =
    !impossible && getTable(TABLE_MAP[strengthType as keyof typeof TABLE_MAP])
      ? getValueForScore(
          getTable(TABLE_MAP[strengthType as keyof typeof TABLE_MAP])!,
          colIdx,
          strengthPts
        )
      : null;
  const coreVal =
    !impossible && getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP])
      ? getValueForScore(
          getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP])!,
          colIdx,
          corePts
        )
      : null;

  const walkThreshold = cardioType === 'walk' ? getWalkThreshold(ageGroup, gender) : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What Do I Need?</Text>

      <View style={styles.tierRow}>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={t.score}
            style={[styles.tierBtn, selectedTier === t.score && styles.tierBtnActive]}
            onPress={() => setSelectedTier(t.score)}
          >
            <Text style={[styles.tierLabel, selectedTier === t.score && styles.tierLabelActive]}>
              {t.label}
            </Text>
            <Text style={styles.tierScore}>{t.score}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {impossible && (
        <View style={styles.impossibleBox}>
          <Text style={styles.impossibleText}>
            Your current WHtR score ({whtrScore} pts) is not enough to reach {selectedTier} — you
            need at least {selectedTier - MAX_OTHERS} pts from WHtR to make this tier possible.
          </Text>
        </View>
      )}

      {/* Table header */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.eventCol]}>Event</Text>
          <Text style={[styles.headerCell, styles.needCol]}>Need</Text>
          <Text style={[styles.headerCell, styles.ptsCol]}>Points</Text>
        </View>

        {/* WHtR row */}
        <View style={[styles.tableRow, styles.anchorRow]}>
          <View style={styles.eventCol}>
            <Text style={styles.eventText}>Waist-to-Height</Text>
            <View style={styles.anchorBadge}>
              <Text style={styles.anchorBadgeText}>ANCHORED</Text>
            </View>
          </View>
          <Text
            style={[
              styles.needCol,
              styles.needVal,
              { color: whtrScore > 0 ? colors.highlightGood : colors.textMuted },
            ]}
          >
            {whtrScore > 0 ? 'current score' : 'not entered'}
          </Text>
          <Text style={[styles.ptsCol, styles.ptsText]}>{whtrScore} pts</Text>
        </View>

        {/* Cardio row */}
        {cardioType === 'walk' ? (
          <View style={styles.tableRow}>
            <Text style={[styles.eventCol, styles.eventText]}>{cardioLabel[cardioType]}</Text>
            <Text style={[styles.needCol, styles.needVal, { color: colors.highlightMin }]}>
              {walkThreshold != null ? `≤ ${formatValue(walkThreshold, 'walk')}` : '—'}
            </Text>
            <Text style={[styles.ptsCol, { color: colors.accentBlue, fontWeight: '600', fontSize: 12 }]}>
              Must PASS
            </Text>
          </View>
        ) : (
          <View style={styles.tableRow}>
            <Text style={[styles.eventCol, styles.eventText]}>
              {cardioLabel[cardioType] ?? cardioType}
            </Text>
            <Text style={[styles.needCol, styles.needVal, { color: colors.highlightGood }]}>
              {impossible
                ? '—'
                : cardioVal != null
                ? `${getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP])?.isLowerBetter ? '≤' : '≥'} ${formatValue(cardioVal, cardioType)}`
                : '—'}
            </Text>
            <Text style={[styles.ptsCol, styles.ptsText]}>
              {impossible ? '—' : `${cardioPts} pts`}
            </Text>
          </View>
        )}

        {/* Strength row */}
        <View style={styles.tableRow}>
          <Text style={[styles.eventCol, styles.eventText]}>
            {strengthLabel[strengthType] ?? strengthType}
          </Text>
          <Text style={[styles.needCol, styles.needVal, { color: colors.highlightGood }]}>
            {impossible ? '—' : strengthVal != null ? `≥ ${formatValue(strengthVal, strengthType)}` : '—'}
          </Text>
          <Text style={[styles.ptsCol, styles.ptsText]}>
            {impossible ? '—' : `${strengthPts} pts`}
          </Text>
        </View>

        {/* Core row */}
        <View style={styles.tableRow}>
          <Text style={[styles.eventCol, styles.eventText]}>
            {coreLabel[coreType] ?? coreType}
          </Text>
          <Text style={[styles.needCol, styles.needVal, { color: colors.highlightGood }]}>
            {impossible
              ? '—'
              : coreVal != null
              ? `${getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP])?.isLowerBetter ? '≤' : '≥'} ${formatValue(coreVal, coreType)}`
              : '—'}
          </Text>
          <Text style={[styles.ptsCol, styles.ptsText]}>
            {impossible ? '—' : `${corePts} pts`}
          </Text>
        </View>

        {/* Total row */}
        <View style={[styles.tableRow, styles.totalRow]}>
          <Text style={[styles.eventCol, { opacity: 0 }]}>—</Text>
          <Text style={[styles.needCol, styles.totalLabel]}>Projected Total</Text>
          <Text
            style={[
              styles.ptsCol,
              styles.totalPts,
              {
                color:
                  !impossible && totalPts >= 75 ? colors.highlightMin : colors.accentRed,
              },
            ]}
          >
            {impossible ? 'N/A' : `${totalPts} pts`}
          </Text>
        </View>
      </View>

      {cardioType === 'walk' && (
        <Text style={styles.walkNote}>
          Walk is pass/fail — your total score is based on the other three events.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.accentBlue,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 6,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tierBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
  },
  tierBtnActive: {
    borderColor: colors.accentBlue,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  tierLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tierLabelActive: {
    color: colors.accentBlue,
  },
  tierScore: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMain,
  },
  impossibleBox: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  impossibleText: {
    fontSize: 13,
    color: colors.accentRed,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  anchorRow: {
    backgroundColor: 'rgba(56,189,248,0.04)',
  },
  eventCol: {
    flex: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventText: {
    fontSize: 14,
    color: colors.textMain,
  },
  needCol: {
    flex: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  needVal: {
    fontWeight: '600',
    fontSize: 13,
  },
  ptsCol: {
    flex: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  ptsText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textMuted,
    textAlign: 'right',
  },
  totalPts: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  anchorBadge: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  anchorBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.accentBlue,
    letterSpacing: 0.4,
  },
  walkNote: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
