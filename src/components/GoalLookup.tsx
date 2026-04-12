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

type EventKey = 'cardio' | 'strength' | 'core';

/**
 * Distributes `remaining` points across the unlocked subset of events using
 * the largest-remainder method so parts sum exactly to `remaining`.
 * Returns null if remaining exceeds what the unlocked events can provide.
 */
function distributeRemaining(
  remaining: number,
  unlocked: { key: EventKey; max: number }[]
): Record<EventKey, number> | null {
  const base: Record<EventKey, number> = { cardio: 0, strength: 0, core: 0 };
  if (remaining <= 0) return base;
  if (unlocked.length === 0) return null;

  const totalMax = unlocked.reduce((s, u) => s + u.max, 0);
  if (remaining > totalMax) return null;

  const exact = unlocked.map((u) => (u.max / totalMax) * remaining);
  const floors = exact.map((v) => Math.floor(v));
  const deficit = remaining - floors.reduce((s, v) => s + v, 0);
  const rems = exact.map((v, i) => ({ i, r: v - floors[i] }));
  rems.sort((a, b) => b.r - a.r);
  rems.slice(0, deficit).forEach(({ i }) => {
    floors[i]++;
  });

  const result = { ...base };
  unlocked.forEach((u, i) => {
    result[u.key] = floors[i];
  });
  return result;
}

interface GoalLookupProps {
  colIdx: number;
  ageGroup: string;
  gender: string;
  cardioType: string;
  strengthType: string;
  coreType: string;
  whtrScore: number;
  cardioScore: number;
  strengthScore: number;
  coreScore: number;
  lockedCardio: boolean;
  lockedStrength: boolean;
  lockedCore: boolean;
}

const CARDIO_LABELS: Record<string, string> = {
  run: '2-Mile Run',
  hamr: '20m HAMR',
  walk: '1.2mi Walk',
};
const STRENGTH_LABELS: Record<string, string> = {
  pushup: 'Push-ups',
  handrelease: 'HR Push-ups',
};
const CORE_LABELS: Record<string, string> = {
  situp: 'Sit-ups',
  crunches: 'Cross-Leg Crunches',
  plank: 'Plank',
};

export function GoalLookup({
  colIdx,
  ageGroup,
  gender,
  cardioType,
  strengthType,
  coreType,
  whtrScore,
  cardioScore,
  strengthScore,
  coreScore,
  lockedCardio,
  lockedStrength,
  lockedCore,
}: GoalLookupProps) {
  const [selectedTier, setSelectedTier] = useState(75);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Sum of locked event scores contributing to target math.
  // Walk is pass/fail and contributes 0, so its "locked" state doesn't matter.
  const isWalk = cardioType === 'walk';
  const lockedCardioEffective = !isWalk && lockedCardio;

  const lockedSum =
    whtrScore +
    (lockedCardioEffective ? cardioScore : 0) +
    (lockedStrength ? strengthScore : 0) +
    (lockedCore ? coreScore : 0);

  const remaining = selectedTier - lockedSum;

  const unlockedEvents: { key: EventKey; max: number }[] = [];
  if (!isWalk && !lockedCardio) unlockedEvents.push({ key: 'cardio', max: EVENT_MAX.cardio });
  if (!lockedStrength) unlockedEvents.push({ key: 'strength', max: EVENT_MAX.strength });
  if (!lockedCore) unlockedEvents.push({ key: 'core', max: EVENT_MAX.core });

  const dist = distributeRemaining(remaining, unlockedEvents);
  const alreadyThere = remaining <= 0;
  const impossible = dist === null && !alreadyThere;

  const cardioTargetPts = lockedCardioEffective ? cardioScore : dist?.cardio ?? 0;
  const strengthTargetPts = lockedStrength ? strengthScore : dist?.strength ?? 0;
  const coreTargetPts = lockedCore ? coreScore : dist?.core ?? 0;

  const totalPts =
    whtrScore + (isWalk ? 0 : cardioTargetPts) + strengthTargetPts + coreTargetPts;

  const cardioTable = !isWalk ? getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP]) : null;
  const strengthTable = getTable(TABLE_MAP[strengthType as keyof typeof TABLE_MAP]);
  const coreTable = getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP]);

  const cardioTargetVal =
    !impossible && !isWalk && !lockedCardio && cardioTable
      ? getValueForScore(cardioTable, colIdx, cardioTargetPts)
      : null;
  const strengthTargetVal =
    !impossible && !lockedStrength && strengthTable
      ? getValueForScore(strengthTable, colIdx, strengthTargetPts)
      : null;
  const coreTargetVal =
    !impossible && !lockedCore && coreTable
      ? getValueForScore(coreTable, colIdx, coreTargetPts)
      : null;

  const walkThreshold = isWalk ? getWalkThreshold(ageGroup, gender) : null;

  /**
   * Per-tier targets for a single event, assuming every OTHER event stays
   * at its current score. Pure "what do I need on this one event?"
   */
  function perTierForEvent(
    eventKey: EventKey,
    currentScore: number,
    table: ScoringTable | null,
    maxPts: number,
    valueType: string
  ) {
    // Sum of everything EXCEPT this event (at current scores)
    const othersSum =
      whtrScore +
      (eventKey !== 'cardio' ? (isWalk ? 0 : cardioScore) : 0) +
      (eventKey !== 'strength' ? strengthScore : 0) +
      (eventKey !== 'core' ? coreScore : 0);

    return TIERS.map((tier) => {
      const needPts = Math.max(0, tier.score - othersSum);
      if (needPts === 0) {
        return { tier, needPts: 0, val: null as number | null, already: true, impossible: false };
      }
      if (needPts > maxPts || !table) {
        return { tier, needPts, val: null, already: false, impossible: true };
      }
      const val = getValueForScore(table, colIdx, needPts);
      return { tier, needPts, val, already: false, impossible: val === null };
    });
  }

  const toggleRow = (key: string) => {
    setExpandedRow(expandedRow === key ? null : key);
  };

  // Messaging states for the summary
  const anythingLocked = lockedCardio || lockedStrength || lockedCore;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>What Do I Need?</Text>
      <Text style={styles.helpText}>
        Tap 🔒 on any event to lock it in. Tap any row below for per-tier targets.
      </Text>

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

      {alreadyThere && anythingLocked && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✓ You're already at {selectedTier}! Locked total: {lockedSum} pts
            {lockedSum > selectedTier && ` (+${lockedSum - selectedTier} over)`}
          </Text>
        </View>
      )}

      {impossible && (
        <View style={styles.impossibleBox}>
          <Text style={styles.impossibleText}>
            {unlockedEvents.length === 0
              ? `Locked total is ${lockedSum} — unlock an event or lower your target.`
              : `Even with max on ${unlockedEvents
                  .map((u) => u.key)
                  .join(' + ')}, you can't reach ${selectedTier}. Unlock more events or lower your target.`}
          </Text>
        </View>
      )}

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.eventCol]}>Event</Text>
          <Text style={[styles.headerCell, styles.needCol]}>Need</Text>
          <Text style={[styles.headerCell, styles.ptsCol]}>Points</Text>
        </View>

        {/* WHtR row — always locked (it's a measurement) */}
        <TouchableOpacity activeOpacity={0.6} onPress={() => toggleRow('whtr')}>
          <View style={[styles.tableRow, styles.lockedRow]}>
            <View style={styles.eventCol}>
              <Text style={styles.eventText}>Waist-to-Height</Text>
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>LOCKED</Text>
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
        </TouchableOpacity>
        {expandedRow === 'whtr' && (
          <WhtrExpansion whtrScore={whtrScore} />
        )}

        {/* Cardio row */}
        {isWalk ? (
          <TouchableOpacity activeOpacity={0.6} onPress={() => toggleRow('cardio')}>
            <View style={styles.tableRow}>
              <Text style={[styles.eventCol, styles.eventText]}>{CARDIO_LABELS[cardioType]}</Text>
              <Text style={[styles.needCol, styles.needVal, { color: colors.highlightMin }]}>
                {walkThreshold != null ? `≤ ${formatValue(walkThreshold, 'walk')}` : '—'}
              </Text>
              <Text
                style={[
                  styles.ptsCol,
                  { color: colors.accentBlue, fontWeight: '600', fontSize: 12 },
                ]}
              >
                Must PASS
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity activeOpacity={0.6} onPress={() => toggleRow('cardio')}>
              <View style={[styles.tableRow, lockedCardio && styles.lockedRow]}>
                <View style={styles.eventCol}>
                  <Text style={styles.eventText}>
                    {CARDIO_LABELS[cardioType] ?? cardioType}
                  </Text>
                  {lockedCardio && (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedBadgeText}>LOCKED</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.needCol,
                    styles.needVal,
                    {
                      color: lockedCardio
                        ? colors.highlightGood
                        : impossible
                        ? colors.textMuted
                        : colors.highlightGood,
                    },
                  ]}
                >
                  {lockedCardio
                    ? 'current score'
                    : impossible
                    ? '—'
                    : cardioTargetVal != null
                    ? `${cardioTable?.isLowerBetter ? '≤' : '≥'} ${formatValue(cardioTargetVal, cardioType)}`
                    : '—'}
                </Text>
                <Text style={[styles.ptsCol, styles.ptsText]}>
                  {lockedCardio
                    ? `${cardioScore} pts`
                    : impossible
                    ? '—'
                    : `${cardioTargetPts} pts`}
                </Text>
              </View>
            </TouchableOpacity>
            {expandedRow === 'cardio' && (
              <ExpandedTiers
                rows={perTierForEvent('cardio', cardioScore, cardioTable, EVENT_MAX.cardio, cardioType)}
                valueType={cardioType}
                isLowerBetter={cardioTable?.isLowerBetter ?? false}
                eventLabel={CARDIO_LABELS[cardioType] ?? cardioType}
              />
            )}
          </>
        )}

        {/* Strength row */}
        <TouchableOpacity activeOpacity={0.6} onPress={() => toggleRow('strength')}>
          <View style={[styles.tableRow, lockedStrength && styles.lockedRow]}>
            <View style={styles.eventCol}>
              <Text style={styles.eventText}>
                {STRENGTH_LABELS[strengthType] ?? strengthType}
              </Text>
              {lockedStrength && (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>LOCKED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.needCol, styles.needVal, { color: colors.highlightGood }]}>
              {lockedStrength
                ? 'current score'
                : impossible
                ? '—'
                : strengthTargetVal != null
                ? `≥ ${formatValue(strengthTargetVal, strengthType)}`
                : '—'}
            </Text>
            <Text style={[styles.ptsCol, styles.ptsText]}>
              {lockedStrength
                ? `${strengthScore} pts`
                : impossible
                ? '—'
                : `${strengthTargetPts} pts`}
            </Text>
          </View>
        </TouchableOpacity>
        {expandedRow === 'strength' && (
          <ExpandedTiers
            rows={perTierForEvent(
              'strength',
              strengthScore,
              strengthTable,
              EVENT_MAX.strength,
              strengthType
            )}
            valueType={strengthType}
            isLowerBetter={strengthTable?.isLowerBetter ?? false}
            eventLabel={STRENGTH_LABELS[strengthType] ?? strengthType}
          />
        )}

        {/* Core row */}
        <TouchableOpacity activeOpacity={0.6} onPress={() => toggleRow('core')}>
          <View style={[styles.tableRow, lockedCore && styles.lockedRow]}>
            <View style={styles.eventCol}>
              <Text style={styles.eventText}>{CORE_LABELS[coreType] ?? coreType}</Text>
              {lockedCore && (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>LOCKED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.needCol, styles.needVal, { color: colors.highlightGood }]}>
              {lockedCore
                ? 'current score'
                : impossible
                ? '—'
                : coreTargetVal != null
                ? `${coreTable?.isLowerBetter ? '≤' : '≥'} ${formatValue(coreTargetVal, coreType)}`
                : '—'}
            </Text>
            <Text style={[styles.ptsCol, styles.ptsText]}>
              {lockedCore ? `${coreScore} pts` : impossible ? '—' : `${coreTargetPts} pts`}
            </Text>
          </View>
        </TouchableOpacity>
        {expandedRow === 'core' && (
          <ExpandedTiers
            rows={perTierForEvent('core', coreScore, coreTable, EVENT_MAX.core, coreType)}
            valueType={coreType}
            isLowerBetter={coreTable?.isLowerBetter ?? false}
            eventLabel={CORE_LABELS[coreType] ?? coreType}
          />
        )}

        {/* Total row */}
        <View style={[styles.tableRow, styles.totalRow]}>
          <Text style={[styles.eventCol, { opacity: 0 }]}>—</Text>
          <Text style={[styles.needCol, styles.totalLabel]}>Projected Total</Text>
          <Text
            style={[
              styles.ptsCol,
              styles.totalPts,
              {
                color: impossible
                  ? colors.accentRed
                  : totalPts >= 75
                  ? colors.highlightMin
                  : colors.accentRed,
              },
            ]}
          >
            {impossible ? 'N/A' : `${totalPts} pts`}
          </Text>
        </View>
      </View>

      {isWalk && (
        <Text style={styles.walkNote}>
          Walk is pass/fail — your total score is based on the other three events.
        </Text>
      )}
    </View>
  );
}

/* --- sub-components --- */

function ExpandedTiers({
  rows,
  valueType,
  isLowerBetter,
  eventLabel,
}: {
  rows: {
    tier: { label: string; score: number };
    needPts: number;
    val: number | null;
    already: boolean;
    impossible: boolean;
  }[];
  valueType: string;
  isLowerBetter: boolean;
  eventLabel: string;
}) {
  return (
    <View style={expStyles.expansion}>
      <Text style={expStyles.expansionHeader}>
        {eventLabel} targets (others at current score)
      </Text>
      {rows.map(({ tier, needPts, val, already, impossible }) => (
        <View key={tier.label} style={expStyles.expRow}>
          <Text style={expStyles.expTierLabel}>
            {tier.label} <Text style={expStyles.expTierScore}>({tier.score})</Text>
          </Text>
          <Text
            style={[
              expStyles.expVal,
              {
                color: already
                  ? colors.highlightMax
                  : impossible
                  ? colors.accentRed
                  : colors.highlightGood,
              },
            ]}
          >
            {already
              ? '✓ already there'
              : impossible
              ? 'not possible on this event alone'
              : val != null
              ? `${isLowerBetter ? '≤' : '≥'} ${formatValue(val, valueType)} (${needPts} pts)`
              : `${needPts} pts — no target`}
          </Text>
        </View>
      ))}
    </View>
  );
}

function WhtrExpansion({ whtrScore }: { whtrScore: number }) {
  return (
    <View style={expStyles.expansion}>
      <Text style={expStyles.expansionHeader}>Waist-to-Height</Text>
      <Text style={expStyles.expRowNote}>
        WHtR is a physical measurement — update your waist/height above to see how it affects your
        total. Current contribution: {whtrScore} pts of 20.
      </Text>
    </View>
  );
}

const expStyles = StyleSheet.create({
  expansion: {
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accentBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  expansionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  expTierLabel: {
    fontSize: 12,
    color: colors.textMain,
    fontWeight: '600',
  },
  expTierScore: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  expVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  expRowNote: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: colors.accentBlue,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  successBox: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    fontSize: 13,
    color: colors.passGreen,
    fontWeight: '600',
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
  lockedRow: {
    backgroundColor: 'rgba(56,189,248,0.04)',
  },
  eventCol: {
    flex: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  eventText: {
    fontSize: 14,
    color: colors.textMain,
    flexShrink: 1,
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
  lockedBadge: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  lockedBadgeText: {
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
