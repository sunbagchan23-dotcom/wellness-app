// 처음 설정: ① 고정 일정(격자 칠하기) → ② 수면(사이클로 기상 시각 고르기) → ③ 운동(한 질문씩, 누르면 바로 다음) → 시간표
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { exerciseDaysFor } from '../scheduler';
import { sleepOptions } from '../sleep';
import { colors } from '../theme';
import { FixedEvent, Settings } from '../types';
import { formatTime, parseTime } from '../time';
import { Button, ChoiceBox, Sub, TimeInput, Title } from '../ui';
import FixedGrid from './FixedGrid';

// 운동 질문: 러닝과 헬스를 기본으로, 각각 한 번에 얼마나 하는지만 묻습니다.
// 요일은 앱이 정합니다(지금은 월~금). 다른 운동은 나중에 대화형으로 바꿀 예정.
const RUN_MINUTES = [20, 30, 45, 60];
const GYM_MINUTES = [30, 45, 60, 90];
const DEFAULT_PER_WEEK = 5;

type Step = 'fixed' | 'sleep' | 'exDo' | 'runMin' | 'gymMin';
const STEPS: Step[] = ['fixed', 'sleep', 'exDo', 'runMin', 'gymMin'];

export default function Onboarding({
  initial,
  onDone,
}: {
  initial: Settings | null;
  onDone: (s: Settings) => void;
}) {
  const [step, setStep] = useState<Step>('fixed');
  const [fixed, setFixed] = useState<FixedEvent[]>(initial?.fixed ?? []);

  // 수면
  const [bedText, setBedText] = useState(initial ? formatTime(initial.sleep.bedtime) : '23:00');
  const [cycles, setCycles] = useState<number | null>(initial?.sleep.cycles ?? null);

  // 운동
  const [runMin, setRunMin] = useState(30);

  const [scrollOn, setScrollOn] = useState(true);

  const bedtime = parseTime(bedText);
  const options = bedtime === null ? [] : sleepOptions(bedtime);
  const chosen = options.find((o) => o.cycles === cycles);

  /** 마지막 답을 받은 순간 바로 시간표를 만듦 (확인 화면 없음) */
  function finish(exercise: { run: number; gym: number } | null) {
    const items = exercise
      ? [
          { type: '러닝', minutes: exercise.run },
          { type: '헬스', minutes: exercise.gym },
        ]
      : [];
    onDone({
      fixed,
      sleep: {
        bedtime: bedtime ?? 23 * 60,
        hours: chosen?.inBedHours ?? 7.75,
        cycles: chosen?.cycles ?? 5,
      },
      exercise: {
        enabled: !!exercise,
        types: items.map((i) => i.type),
        minutes: items.reduce((sum, i) => sum + i.minutes, 0),
        items,
        perWeek: DEFAULT_PER_WEEK,
        days: exerciseDaysFor(DEFAULT_PER_WEEK),
      },
    });
  }

  const go = (s: Step) => setStep(s);
  const back = () => go(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled" scrollEnabled={scrollOn}>
      <View style={st.top}>
        {step !== 'fixed' ? (
          <Pressable onPress={back} hitSlop={12}>
            <Text style={st.back}>‹ 이전</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={st.dots}>
          {STEPS.map((s) => (
            <View key={s} style={[st.dot, s === step && st.dotOn]} />
          ))}
        </View>
      </View>

      {step === 'fixed' && (
        <>
          <Title>매주 반복되는 일정을 칠해 주세요</Title>
          <Sub>출근, 수업처럼 매주 같은 요일·시간에 있는 일정이에요.</Sub>
          <FixedGrid initial={fixed} onChange={setFixed} onTouching={(t) => setScrollOn(!t)} />
          <Button label="다음: 수면" onPress={() => go('sleep')} />
        </>
      )}

      {step === 'sleep' && (
        <>
          <Title>몇 시에 잠자리에 드나요?</Title>
          <TimeInput style={st.bigInput} value={bedText} onChange={setBedText} />
          {bedtime === null ? (
            <Text style={st.error}>숫자 4자리로 적어 주세요. 예: 2300</Text>
          ) : (
            <>
              <Text style={st.q}>이 시각에 일어나세요</Text>
              <Sub>잠드는 15분과 90분 수면 사이클로 계산했습니다.</Sub>
              <View style={st.grid}>
                {options.map((o) => (
                  <Pressable
                    key={o.cycles}
                    onPress={() => setCycles(o.cycles)}
                    style={[
                      st.cell,
                      o.level === 'good' && st.cellGood,
                      o.level === 'short' && { opacity: 0.55 },
                      cycles === o.cycles && st.cellOn,
                    ]}
                  >
                    {o.level === 'good' ? (
                      <Text style={st.badge}>추천</Text>
                    ) : (
                      <Text style={st.cellEmoji}>{o.level === 'ok' ? '😐' : '☹️'}</Text>
                    )}
                    <Text style={st.cellTime}>{formatTime(o.wake)}</Text>
                    <Text style={st.cellSub}>
                      {o.cycles}사이클 · {o.sleepHours}시간
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Sub>초록색 칸은 7시간 이상 자는 추천 선택입니다.</Sub>
            </>
          )}
          <Button label="다음: 운동" disabled={!chosen} onPress={() => go('exDo')} />
        </>
      )}

      {step === 'exDo' && (
        <>
          <Title>운동을 하고 있나요?</Title>
          <ChoiceBox label="네, 하고 있어요" onPress={() => go('runMin')} />
          <ChoiceBox label="아직은 안 해요" hint="운동 없이 시간표를 짭니다" onPress={() => finish(null)} />
        </>
      )}

      {step === 'runMin' && (
        <>
          <Title>러닝은 한 번에 얼마나 하나요?</Title>
          {RUN_MINUTES.map((m) => (
            <ChoiceBox
              key={m}
              label={`${m}분`}
              onPress={() => {
                setRunMin(m);
                go('gymMin');
              }}
            />
          ))}
        </>
      )}

      {step === 'gymMin' && (
        <>
          <Title>헬스는 한 번에 얼마나 하나요?</Title>
          {GYM_MINUTES.map((m) => (
            <ChoiceBox key={m} label={`${m}분`} onPress={() => finish({ run: runMin, gym: m })} />
          ))}
          <Sub>월~금 아침, 러닝이 끝나면 바로 헬스로 이어갑니다.</Sub>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: { color: colors.accent, fontSize: 16 },
  dots: { flexDirection: 'row' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginLeft: 5 },
  dotOn: { backgroundColor: colors.accent, width: 16 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemSub: { color: colors.sub, marginTop: 4 },
  time: { width: 100 },
  bigInput: { fontSize: 32, fontWeight: '700', textAlign: 'center', paddingVertical: 14, marginTop: 8 },
  tilde: { color: colors.sub, marginHorizontal: 8, marginBottom: 8 },
  error: { color: colors.warn, marginBottom: 8 },
  q: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  cellGood: { backgroundColor: '#15291F', borderColor: '#2E6B4C' },
  cellOn: { borderColor: colors.accent, borderWidth: 2.5 },
  badge: {
    color: colors.bg,
    backgroundColor: colors.done,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cellEmoji: { fontSize: 20 },
  cellTime: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  cellSub: { color: colors.sub, marginTop: 4 },
});
