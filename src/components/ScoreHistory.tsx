import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { HistoryEntry } from '../types';
import { formatValue } from '../scoring';
import { colors } from '../theme';

interface ScoreHistoryProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onImport: (entries: HistoryEntry[]) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const EVENT_LABELS: Record<string, string> = {
  run: 'Run',
  hamr: 'HAMR',
  walk: 'Walk',
  pushup: 'Push-ups',
  handrelease: 'HR Push-ups',
  situp: 'Sit-ups',
  crunches: 'Crunches',
  plank: 'Plank',
};

export function ScoreHistory({ entries, onRemove, onClearAll }: ScoreHistoryProps) {
  const handleClearAll = () => {
    Alert.alert('Clear All', 'Are you sure you want to delete all saved results?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: onClearAll },
    ]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Score History</Text>
        <View style={styles.actions}>
          {entries.length > 1 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>
          No saved results yet. Complete your assessment and tap "Save Results" to track your
          progress.
        </Text>
      ) : (
        <View style={styles.list}>
          {entries.map((entry, idx) => {
            const isLatest = idx === 0;
            const prev = entries[idx + 1];
            const delta = prev ? entry.compositeScore - prev.compositeScore : null;

            return (
              <View
                key={entry.id}
                style={[
                  styles.entry,
                  {
                    borderLeftColor: entry.passed ? colors.passGreen : colors.accentRed,
                  },
                ]}
              >
                <View style={styles.entryTop}>
                  <View style={styles.meta}>
                    <Text style={styles.date}>{formatDate(entry.savedAt)}</Text>
                    <Text style={styles.time}>{formatTime(entry.savedAt)}</Text>
                    {isLatest && (
                      <View style={styles.latestBadge}>
                        <Text style={styles.latestBadgeText}>Latest</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => onRemove(entry.id)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.scoreRow}>
                  <View style={styles.scoreGroup}>
                    <Text style={styles.scoreNum}>{entry.compositeScore}</Text>
                    <Text style={styles.scoreLabel}>pts</Text>
                  </View>
                  <View
                    style={[
                      styles.passBadge,
                      {
                        backgroundColor: entry.passed
                          ? 'rgba(52,211,153,0.2)'
                          : 'rgba(248,113,113,0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.passBadgeText,
                        { color: entry.passed ? colors.passGreen : colors.accentRed },
                      ]}
                    >
                      {entry.passed ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>
                  {delta !== null && (
                    <Text
                      style={[
                        styles.delta,
                        {
                          color:
                            delta > 0
                              ? colors.passGreen
                              : delta < 0
                              ? colors.accentRed
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                    </Text>
                  )}
                </View>

                <View style={styles.breakdown}>
                  <Text style={styles.stat}>WHtR {entry.whtrScore.toFixed(0)}</Text>
                  <Text style={styles.sep}>·</Text>
                  <Text style={styles.stat}>
                    {EVENT_LABELS[entry.cardioType] ?? entry.cardioType}{' '}
                    {entry.cardioType === 'walk'
                      ? formatValue(entry.cardioValue, 'walk')
                      : entry.cardioScore.toFixed(0) + ' pts'}
                  </Text>
                  <Text style={styles.sep}>·</Text>
                  <Text style={styles.stat}>
                    {EVENT_LABELS[entry.strengthType] ?? entry.strengthType}{' '}
                    {entry.strengthScore.toFixed(0)}
                  </Text>
                  <Text style={styles.sep}>·</Text>
                  <Text style={styles.stat}>
                    {EVENT_LABELS[entry.coreType] ?? entry.coreType}{' '}
                    {entry.coreScore.toFixed(0)}
                  </Text>
                </View>

                <Text style={styles.profile}>
                  {entry.gender === 'male' ? 'Male' : 'Female'} ·{' '}
                  {entry.ageGroup === '<25' ? 'Under 25' : entry.ageGroup}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accentBlue,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    paddingBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  list: {
    gap: 10,
  },
  entry: {
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  latestBadge: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  latestBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accentBlue,
    letterSpacing: 0.4,
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  scoreGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  scoreNum: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMain,
    lineHeight: 32,
  },
  scoreLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  passBadge: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  passBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  delta: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  breakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  stat: {
    fontSize: 12,
    color: colors.textMain,
    fontWeight: '500',
  },
  sep: {
    fontSize: 12,
    color: colors.textMuted,
  },
  profile: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
