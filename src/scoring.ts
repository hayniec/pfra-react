import type { ScoringTable, KeyThresholds } from './types';

export const AGE_GROUPS = [
  '<25', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60+',
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const TABLE_MAP = {
  whtr: 0,
  crunches: 1,
  pushup: 2,
  handrelease: 3,
  situp: 4,
  plank: 5,
  run: 6,
  hamr: 7,
} as const;

export type EventKey = keyof typeof TABLE_MAP;

export const TIME_BASED_EVENTS: readonly string[] = ['plank', 'run', 'walk'];

export const PASS_THRESHOLD = 75;

const GOOD_TIER_RATIO = 0.8;

/** Valid input ranges. Time-based values are in seconds. */
export const EVENT_RANGES: Record<string, { min: number; max: number }> = {
  whtr:        { min: 0.30, max: 0.80 },
  run:         { min: 360,  max: 2400 },  // 6:00 – 40:00
  hamr:        { min: 1,    max: 400  },
  pushup:      { min: 0,    max: 200  },
  handrelease: { min: 0,    max: 200  },
  situp:       { min: 0,    max: 200  },
  crunches:    { min: 0,    max: 200  },
  plank:       { min: 1,    max: 3600 },  // up to 60:00
  walk:        { min: 600,  max: 1800 },  // 10:00 – 30:00
};

/** Default input values. Time-based values are in seconds. */
export const DEFAULT_VALUES: Record<string, number> = {
  whtr:        0.50,
  run:         840,   // 14:00
  hamr:        50,
  pushup:      45,
  handrelease: 35,
  situp:       50,
  crunches:    50,
  plank:       180,   // 3:00
  walk:        0,     // start empty
};

// ---- Walk standards (Table 3.1, DAFMAN 36-2905) ----
// Pass/fail only — times in seconds, isLowerBetter = true
// Uses 10-year age brackets

export const WALK_STANDARDS: Record<string, { male: number; female: number }> = {
  '<30':   { male: 976,  female: 1042 }, // 16:16 / 17:22
  '30-39': { male: 978,  female: 1048 }, // 16:18 / 17:28
  '40-49': { male: 983,  female: 1069 }, // 16:23 / 17:49
  '50-59': { male: 1000, female: 1091 }, // 16:40 / 18:11
  '60+':   { male: 1018, female: 1133 }, // 16:58 / 18:53
};

export function getWalkBracket(ageGroup: string): string {
  if (ageGroup === '<25' || ageGroup === '25-29') return '<30';
  if (ageGroup === '30-34' || ageGroup === '35-39') return '30-39';
  if (ageGroup === '40-44' || ageGroup === '45-49') return '40-49';
  if (ageGroup === '50-54' || ageGroup === '55-59') return '50-59';
  return '60+';
}

export function getWalkThreshold(ageGroup: string, gender: string): number {
  const bracket = getWalkBracket(ageGroup);
  const standard = WALK_STANDARDS[bracket];
  return gender === 'female' ? standard.female : standard.male;
}

// ---- HAMR level structure (from official DAF scorecard) ----

export const HAMR_LEVELS = [
  { level: 1,  start: 1,   end: 7   },
  { level: 2,  start: 8,   end: 15  },
  { level: 3,  start: 16,  end: 23  },
  { level: 4,  start: 24,  end: 32  },
  { level: 5,  start: 33,  end: 41  },
  { level: 6,  start: 42,  end: 50  },
  { level: 7,  start: 51,  end: 60  },
  { level: 8,  start: 61,  end: 70  },
  { level: 9,  start: 71,  end: 81  },
  { level: 10, start: 82,  end: 92  },
  { level: 11, start: 93,  end: 104 },
  { level: 12, start: 105, end: 116 },
  { level: 13, start: 117, end: 129 },
  { level: 14, start: 130, end: 142 },
  { level: 15, start: 143, end: 155 },
] as const;

export function getHamrLevel(shuttles: number): { level: number; shuttle: number; totalInLevel: number } | null {
  if (shuttles <= 0) return null;
  for (const lvl of HAMR_LEVELS) {
    if (shuttles >= lvl.start && shuttles <= lvl.end) {
      return {
        level: lvl.level,
        shuttle: shuttles - lvl.start + 1,
        totalInLevel: lvl.end - lvl.start + 1,
      };
    }
  }
  // Beyond level 15
  const last = HAMR_LEVELS[HAMR_LEVELS.length - 1];
  return { level: 16, shuttle: shuttles - last.end, totalInLevel: 0 };
}

// ---- HAMR beep timing (20m shuttle run, standard beep-test speeds) ----

const HAMR_SPEEDS_KMH = [
  8.0, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, 15.0, 15.5,
] as const;

/** Returns ms between beeps for a given 0-based level index. */
export function getHamrIntervalMs(levelIdx: number): number {
  const speed = HAMR_SPEEDS_KMH[Math.min(levelIdx, HAMR_SPEEDS_KMH.length - 1)];
  return Math.round(72000 / speed); // 20m / (speed km/h in m/s) * 1000
}

// ---- Scoring ----

export function getColIdx(ageGroup: string, gender: string): number {
  const ageIdx = (AGE_GROUPS as readonly string[]).indexOf(ageGroup);
  return Math.max(0, ageIdx) * 2 + (gender === 'female' ? 1 : 0);
}

export function calculateScore(table: ScoringTable, colIdx: number, value: number): number {
  const sortedRows = [...table.rows].sort((a, b) => b.score - a.score);
  for (const row of sortedRows) {
    const threshold = row.values[colIdx];
    if (table.isLowerBetter ? value <= threshold : value >= threshold) {
      return row.score;
    }
  }
  return 0;
}

export function getKeyThresholds(table: ScoringTable, colIdx: number): KeyThresholds | null {
  const scoringRows = [...table.rows]
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score > 0);

  if (scoringRows.length === 0) return null;

  const maxRow = scoringRows[0];
  const minRow = scoringRows[scoringRows.length - 1];
  const targetScore = maxRow.score * GOOD_TIER_RATIO;
  const goodRow = scoringRows.reduce((prev, curr) =>
    Math.abs(curr.score - targetScore) < Math.abs(prev.score - targetScore) ? curr : prev
  );

  return {
    isLowerBetter: table.isLowerBetter,
    max: { pts: maxRow.score, val: maxRow.values[colIdx] },
    good: { pts: goodRow.score, val: goodRow.values[colIdx] },
    min: { pts: minRow.score, val: minRow.values[colIdx] },
  };
}

export function formatValue(val: number, type: string): string {
  if (TIME_BASED_EVENTS.includes(type)) {
    const mins = Math.floor(val / 60);
    const secs = val % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (type === 'whtr') return val.toFixed(2);
  return val.toString();
}

/** Returns pace per mile for a 2-mile AF run, or null if no time entered. */
export function getRunPace(totalSeconds: number): { perMile: string } | null {
  if (totalSeconds <= 0) return null;
  return { perMile: formatValue(Math.round(totalSeconds / 2), 'run') };
}

/** Reverse of calculateScore: given target points for an event, returns the minimum
 *  performance value needed to achieve at least that many points. Returns null if
 *  the target exceeds all available scores in the table. */
export function getValueForScore(
  table: ScoringTable,
  colIdx: number,
  targetPts: number,
): number | null {
  const qualifying = table.rows
    .filter(r => r.score >= targetPts)
    .sort((a, b) => a.score - b.score); // ascending — pick lowest qualifying score
  return qualifying.length > 0 ? qualifying[0].values[colIdx] : null;
}

export function validateEvent(type: string, value: number): string | null {
  const range = EVENT_RANGES[type];
  if (!range || value === 0) return null;
  if (value < range.min || value > range.max) {
    if (TIME_BASED_EVENTS.includes(type)) {
      const fmtMin = formatValue(range.min, type);
      const fmtMax = formatValue(range.max, type);
      return `Must be between ${fmtMin} and ${fmtMax}`;
    }
    return `Must be between ${range.min} and ${range.max}`;
  }
  return null;
}
