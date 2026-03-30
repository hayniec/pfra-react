import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import rawScoringData from './src/scoringData.json';
import type { ScoringTable } from './src/types';
import {
  AGE_GROUPS,
  TABLE_MAP,
  PASS_THRESHOLD,
  DEFAULT_VALUES,
  getColIdx,
  calculateScore,
  getKeyThresholds,
  getWalkThreshold,
  getHamrLevel,
  getRunPace,
} from './src/scoring';
import { HamrPlayer } from './src/components/HamrPlayer';
import { RunTracker } from './src/components/RunTracker';
import { GoalLookup } from './src/components/GoalLookup';
import { ScoreHistory } from './src/components/ScoreHistory';
import { EventInput } from './src/components/EventInput';
import type { EventOption } from './src/components/EventInput';
import { useHistory } from './src/hooks/useHistory';
import { WhtrInput } from './src/components/WhtrInput';
import { colors } from './src/theme';

const scoringData = rawScoringData as ScoringTable[];

function getTable(id: number): ScoringTable | undefined {
  return scoringData.find((t) => t.id === id);
}

const CARDIO_OPTIONS: EventOption[] = [
  { value: 'run', label: 'Run' },
  { value: 'hamr', label: '20m HAMR' },
  { value: 'walk', label: '1.2mi Walk' },
];

const STRENGTH_OPTIONS: EventOption[] = [
  { value: 'pushup', label: 'Push-ups' },
  { value: 'handrelease', label: 'HR Push-ups' },
];

const CORE_OPTIONS: EventOption[] = [
  { value: 'situp', label: 'Sit-ups' },
  { value: 'crunches', label: 'Cross-Leg Crunches' },
  { value: 'plank', label: 'Forearm Plank' },
];

export default function App() {
  const [gender, setGender] = useState('male');
  const [ageGroup, setAgeGroup] = useState('<25');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const { entries, save, remove, clearAll, importEntries } = useHistory();

  const [whtrValue, setWhtrValue] = useState(DEFAULT_VALUES.whtr);
  const [cardioType, setCardioType] = useState('run');
  const [cardioValue, setCardioValue] = useState(DEFAULT_VALUES.run);
  const [strengthType, setStrengthType] = useState('pushup');
  const [strengthValue, setStrengthValue] = useState(DEFAULT_VALUES.pushup);
  const [coreType, setCoreType] = useState('situp');
  const [coreValue, setCoreValue] = useState(DEFAULT_VALUES.situp);

  const colIdx = useMemo(() => getColIdx(ageGroup, gender), [ageGroup, gender]);

  const whtrScore = useMemo(() => {
    const table = getTable(TABLE_MAP.whtr);
    return table ? calculateScore(table, colIdx, whtrValue) : 0;
  }, [whtrValue, colIdx]);

  const cardioScore = useMemo(() => {
    if (cardioType === 'walk') return 0;
    const table = getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP]);
    return table ? calculateScore(table, colIdx, cardioValue) : 0;
  }, [cardioType, cardioValue, colIdx]);

  const strengthScore = useMemo(() => {
    const table = getTable(TABLE_MAP[strengthType as keyof typeof TABLE_MAP]);
    return table ? calculateScore(table, colIdx, strengthValue) : 0;
  }, [strengthType, strengthValue, colIdx]);

  const coreScore = useMemo(() => {
    const table = getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP]);
    return table ? calculateScore(table, colIdx, coreValue) : 0;
  }, [coreType, coreValue, colIdx]);

  const walkPassFail = useMemo(() => {
    if (cardioType !== 'walk') return null;
    const threshold = getWalkThreshold(ageGroup, gender);
    const passed = cardioValue > 0 ? cardioValue <= threshold : null;
    return { threshold, passed };
  }, [cardioType, cardioValue, ageGroup, gender]);

  const totalScore = Math.round(cardioScore + strengthScore + coreScore + whtrScore);
  const cardioPass =
    cardioType === 'walk' ? walkPassFail?.passed === true : cardioScore > 0;
  const isPass =
    totalScore >= PASS_THRESHOLD && cardioPass && strengthScore > 0 && coreScore > 0;

  const whtrThresholds = useMemo(() => {
    const table = getTable(TABLE_MAP.whtr);
    return table ? getKeyThresholds(table, colIdx) : null;
  }, [colIdx]);

  const cardioThresholds = useMemo(() => {
    if (cardioType === 'walk') return null;
    const table = getTable(TABLE_MAP[cardioType as keyof typeof TABLE_MAP]);
    return table ? getKeyThresholds(table, colIdx) : null;
  }, [cardioType, colIdx]);

  const hamrLevel = useMemo(() => {
    if (cardioType !== 'hamr' || cardioValue <= 0) return null;
    return getHamrLevel(cardioValue);
  }, [cardioType, cardioValue]);

  const runPace = useMemo(() => {
    if (cardioType !== 'run') return null;
    return getRunPace(cardioValue);
  }, [cardioType, cardioValue]);

  const strengthThresholds = useMemo(() => {
    const table = getTable(TABLE_MAP[strengthType as keyof typeof TABLE_MAP]);
    return table ? getKeyThresholds(table, colIdx) : null;
  }, [strengthType, colIdx]);

  const coreThresholds = useMemo(() => {
    const table = getTable(TABLE_MAP[coreType as keyof typeof TABLE_MAP]);
    return table ? getKeyThresholds(table, colIdx) : null;
  }, [coreType, colIdx]);

  const handleCardioTypeChange = (type: string) => {
    setCardioType(type);
    setCardioValue(DEFAULT_VALUES[type]);
  };

  const handleStrengthTypeChange = (type: string) => {
    setStrengthType(type);
    setStrengthValue(DEFAULT_VALUES[type]);
  };

  const handleCoreTypeChange = (type: string) => {
    setCoreType(type);
    setCoreValue(DEFAULT_VALUES[type]);
  };

  const canSave = totalScore > 0;

  const handleSave = () => {
    save({
      ageGroup,
      gender,
      cardioType,
      cardioValue,
      strengthType,
      strengthValue,
      coreType,
      coreValue,
      whtrValue,
      compositeScore: totalScore,
      passed: isPass,
      whtrScore,
      cardioScore,
      strengthScore,
      coreScore,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgDark} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AIR FORCE PFRA</Text>
          <Text style={styles.headerSubtitle}>
            Physical Fitness Readiness Assessment Calculator
          </Text>
        </View>

        {/* Member Profile */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Member Profile</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Gender</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={gender}
                  onValueChange={setGender}
                  style={styles.picker}
                  dropdownIconColor={colors.textMain}
                >
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>
            </View>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Age Group</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={ageGroup}
                  onValueChange={setAgeGroup}
                  style={styles.picker}
                  dropdownIconColor={colors.textMain}
                >
                  {AGE_GROUPS.map((age) => (
                    <Picker.Item
                      key={age}
                      label={age === '<25' ? 'Under 25' : age}
                      value={age}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Assessment Events */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assessment Events</Text>

          <WhtrInput onChange={setWhtrValue} thresholds={whtrThresholds} score={whtrScore} />

          <GoalLookup
            colIdx={colIdx}
            ageGroup={ageGroup}
            gender={gender}
            cardioType={cardioType}
            strengthType={strengthType}
            coreType={coreType}
            whtrScore={whtrScore}
          />

          <EventInput
            key={cardioType}
            sectionLabel="Cardiorespiratory"
            maxPts={50}
            options={CARDIO_OPTIONS}
            selectedType={cardioType}
            onTypeChange={handleCardioTypeChange}
            value={cardioValue}
            onChange={setCardioValue}
            placeholder={cardioType === 'hamr' ? 'Total Shuttles' : 'Enter value'}
            thresholds={cardioThresholds}
            valueType={cardioType}
            score={cardioType === 'walk' ? undefined : cardioScore}
            walkPassFail={walkPassFail}
            hamrLevel={hamrLevel}
            paceInfo={runPace}
          />
          {cardioType === 'hamr' && <HamrPlayer />}
          {cardioType === 'run' && (
            <RunTracker onComplete={(secs) => setCardioValue(secs)} />
          )}

          <EventInput
            key={strengthType}
            sectionLabel="Upper Body Strength"
            maxPts={15}
            options={STRENGTH_OPTIONS}
            selectedType={strengthType}
            onTypeChange={handleStrengthTypeChange}
            value={strengthValue}
            onChange={setStrengthValue}
            placeholder="Repetitions"
            thresholds={strengthThresholds}
            valueType={strengthType}
            score={strengthScore}
          />

          <EventInput
            key={coreType}
            sectionLabel="Core Strength"
            maxPts={15}
            options={CORE_OPTIONS}
            selectedType={coreType}
            onTypeChange={handleCoreTypeChange}
            value={coreValue}
            onChange={setCoreValue}
            placeholder="Repetitions"
            thresholds={coreThresholds}
            valueType={coreType}
            score={coreScore}
          />
        </View>

        {/* Composite Score */}
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreLabel}>Composite Score</Text>
          <Text style={styles.scoreValue}>{totalScore.toFixed(1)}</Text>
          <Text
            style={[
              styles.scoreStatus,
              {
                color: isPass
                  ? totalScore >= 90
                    ? colors.statusExcellent
                    : colors.statusPassLight
                  : colors.statusFailLight,
              },
            ]}
          >
            {isPass ? (totalScore >= 90 ? 'Excellent' : 'Satisfactory') : 'Unsatisfactory'}
          </Text>

          <View style={styles.scoreBreakdown}>
            {[
              { label: 'WHtR Score', value: whtrScore, max: 20 },
              { label: 'Cardio Score', value: cardioScore, max: 50 },
              { label: 'Strength Score', value: strengthScore, max: 15 },
              { label: 'Core Score', value: coreScore, max: 15 },
            ].map(({ label, value, max }) => (
              <View key={label} style={styles.componentScore}>
                <Text style={styles.componentLabel}>{label}:</Text>
                <Text style={styles.componentValue}>
                  {value.toFixed(1)} / {max}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!canSave || savedFeedback) && styles.saveBtnDisabled,
              savedFeedback && styles.saveBtnSaved,
            ]}
            onPress={handleSave}
            disabled={!canSave || savedFeedback}
          >
            <Text
              style={[
                styles.saveBtnText,
                (!canSave || savedFeedback) && styles.saveBtnTextDisabled,
                savedFeedback && styles.saveBtnTextSaved,
              ]}
            >
              {savedFeedback ? '✓ Saved!' : 'Save Results'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Score History */}
        <ScoreHistory
          entries={entries}
          onRemove={remove}
          onClearAll={clearAll}
          onImport={importEntries}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accentBlue,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
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
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerGroup: {
    flex: 1,
  },
  pickerLabel: {
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pickerWrapper: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textMain,
    height: 48,
  },
  scoreDisplay: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.afBlue,
    borderRadius: 16,
    marginTop: 16,
  },
  scoreLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.8,
    marginBottom: 6,
    color: colors.textMain,
    fontSize: 13,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textMain,
    lineHeight: 52,
  },
  scoreStatus: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scoreBreakdown: {
    marginTop: 20,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    borderRadius: 12,
  },
  componentScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  componentLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  componentValue: {
    color: colors.textMain,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.accentBlue,
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  saveBtnSaved: {
    backgroundColor: colors.passGreen,
  },
  saveBtnText: {
    color: colors.bgDark,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  saveBtnTextDisabled: {
    color: colors.textMuted,
  },
  saveBtnTextSaved: {
    color: colors.bgDark,
  },
});
