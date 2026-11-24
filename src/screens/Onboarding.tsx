// 처음 설정: ① 고정 일정 → ② 수면(사이클로 기상 시각 고르기) → ③ 운동(인터뷰형, 한 질문씩) → ④ 확인
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildWeek, exerciseDaysFor } from '../scheduler';
import { sleepOptions } from '../sleep';
import { colors } from '../theme';
import { DAY_LABELS, FixedEvent, Settings } from '../types';
import { formatTime, parseTime } from '../time';
import { Button, Card, ChoiceBox, Sub, TimeInput, Title } from '../ui';
import FixedGrid from './FixedGrid';


// 운동 인터뷰 질문들
const EXERCISE_MINUTES = [30, 45, 60, 90];
const EXERCISE_PER_WEEK = [3, 4, 5, 6];

type Step = 'fixed' | 'sleep' | 'exDo' | 'exKind' | 'exMin' | 'exFreq' | 'review';
const STEPS: Step[] = ['fixed', 'sleep', 'exDo', 'exKind', 'exMin', 'exFreq', 'review'];

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
  const [exOn, setExOn] = useState(initial?.exercise.enabled ?? true);
  const [exTypes, setExTypes] = useState<string[]>(initial?.exercise.types ?? ['러닝', '헬스']);
  const [exMin, setExMin] = useState(initial?.exercise.minutes ?? 60);
  const [exPerWeek, setExPerWeek] = useState(initial?.exercise.perWeek ?? 5);

  const [scrollOn, setScrollOn] = useState(true);

  const bedtime = parseTime(bedText);
  const options = bedtime === null ? [] : sleepOptions(bedtime);
  const chosen = options.find((o) => o.cycles === cycles);

  const settings = (): Settings => ({
    fixed,
    sleep: {
      bedtime: bedtime ?? 23 * 60,
      hours: chosen?.inBedHours ?? 7.75,
      cycles: chosen?.cycles ?? 5,
    },
    exercise: {
      enabled: exOn,
      types: exTypes,
      minutes: exMin,
      perWeek: exPerWeek,
      days: exerciseDaysFor(exPerWeek),
    },
  });

  const go = (s: Step) => setStep(s);
  const back = () => {
    if (step === 'review' && !exOn) return go('exDo');
    go(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);
  };

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
              <Text style={st.q}>이때 일어나면 사이클이 끝나는 시점이에요</Text>
              <Sub>잠드는 데 15분, 한 사이클 90분으로 계산했어요. 사람마다 사이클 길이가 달라서 대략적인 안내입니다.</Sub>
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
              <Sub>초록색 칸은 성인 권장 수면(7시간 이상)을 채우는 추천 선택이에요. 고른 시각은 매일 같은 취침·기상 시각으로 시간표에 고정돼요.</Sub>
            </>
          )}
          <Button label="다음: 운동" disabled={!chosen} onPress={() => go('exDo')} />
        </>
      )}

      {step === 'exDo' && (
        <>
          <Title>운동을 하고 있나요?</Title>
          <ChoiceBox
            label="네, 하고 있어요"
            on={exOn}
            onPress={() => {
              setExOn(true);
              go('exKind');
            }}
          />
          <ChoiceBox
            label="아직은 안 해요"
            hint="시간표에 운동을 넣지 않아요. 나중에 바꿀 수 있어요"
            on={!exOn}
            onPress={() => {
              setExOn(false);
              go('review');
            }}
          />
        </>
      )}

      {step === 'exKind' && (
        <>
          <Title>처음엔 러닝 + 헬스부터 시작해 보세요</Title>
          <Sub>
            운동을 잘 몰라도 가장 시작하기 쉬운 조합이에요. 장비나 강습 없이 바로 할 수 있고, 유산소(러닝)와 근력(헬스)을 같이 챙길 수 있어요.
          </Sub>
          <ChoiceBox
            label="좋아요, 러닝 + 헬스로 할게요"
            hint="아침에 같이 넣어 드려요"
            on
            onPress={() => {
              setExTypes(['러닝', '헬스']);
              go('exMin');
            }}
          />
          <Sub>다른 운동이나 취미 운동은 시간표가 나온 뒤 대화로 바꿀 수 있게 만들 예정이에요.</Sub>
        </>
      )}

      {step === 'exMin' && (
        <>
          <Title>한 번 하면 얼마나 하나요?</Title>
          {EXERCISE_MINUTES.map((m) => (
            <ChoiceBox
              key={m}
              label={`${m}분`}
              on={exMin === m}
              onPress={() => {
                setExMin(m);
                go('exFreq');
              }}
            />
          ))}
        </>
      )}

      {step === 'exFreq' && (
        <>
          <Title>일주일에 몇 번 하고 싶나요?</Title>
          <Sub>요일과 시간대는 다른 일정을 보고 앱이 정해요. 기상 30분 뒤부터 오전 빈 시간에 먼저 넣습니다.</Sub>
          {EXERCISE_PER_WEEK.map((n) => (
            <ChoiceBox
              key={n}
              label={`주 ${n}회`}
              hint={exerciseDaysFor(n).map((d) => DAY_LABELS[d]).join(' ')}
              on={exPerWeek === n}
              onPress={() => {
                setExPerWeek(n);
                go('review');
              }}
            />
          ))}
        </>
      )}

      {step === 'review' && <Review settings={settings()} onDone={() => onDone(settings())} />}
    </ScrollView>
  );
}

function Review({ settings, onDone }: { settings: Settings; onDone: () => void }) {
  const week = buildWeek(settings, [], 0);
  const { sleep, exercise } = settings;
  return (
    <View>
      <Title>이렇게 시간표를 만들게요</Title>
      {settings.fixed.length > 0 && (
        <Card>
          {settings.fixed.map((f) => (
            <Text key={f.id} style={st.itemSub}>
              {f.title} · {f.days.map((d) => DAY_LABELS[d]).join(' ')} · {formatTime(f.start)}~{formatTime(f.end)}
            </Text>
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.itemTitle}>
          수면 {formatTime(sleep.bedtime)} → {formatTime(sleep.bedtime + Math.round(sleep.hours * 60))}
        </Text>
        <Text style={st.itemSub}>{sleep.cycles}사이클</Text>
      </Card>
      {exercise.enabled && (
        <Card>
          <Text style={st.itemTitle}>
            {exercise.types.join(' + ')} {exercise.minutes}분
          </Text>
          <Text style={st.itemSub}>
            주 {exercise.perWeek}회 · {exercise.days.map((d) => DAY_LABELS[d]).join(' ')}
          </Text>
        </Card>
      )}
      {week.conflicts.length > 0 && (
        <>
          <Sub>아래 충돌이 있어요. 이전으로 돌아가 고치거나, 이대로 만들고 나중에 고칠 수 있습니다.</Sub>
          {week.conflicts.map((c, i) => (
            <Card key={i}>
              <Text style={{ color: colors.warn }}>{c.message}</Text>
            </Card>
          ))}
        </>
      )}
      <Button label="시간표 만들기" onPress={onDone} />
    </View>
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
