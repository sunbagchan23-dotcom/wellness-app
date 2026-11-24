// 처음 설정: ① 고정 일정 → ② 수면(사이클로 기상 시각 고르기) → ③ 운동(인터뷰형, 한 질문씩) → ④ 확인
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildWeek, exerciseDaysFor } from '../scheduler';
import { sleepOptions } from '../sleep';
import { colors } from '../theme';
import { DAY_LABELS, DayIndex, FixedEvent, Settings } from '../types';
import { formatTime, parseTime } from '../time';
import { Button, Card, Chip, ChoiceBox, Input, Row, Sub, TimeInput, Title } from '../ui';

const ALL_DAYS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];

// 운동 인터뷰 질문들
const EXERCISE_KINDS: { label: string; types: string[]; hint?: string }[] = [
  { label: '러닝 + 헬스', types: ['러닝', '헬스'], hint: '기본 추천. 아침에 같이 합니다' },
  { label: '러닝', types: ['러닝'] },
  { label: '헬스', types: ['헬스'] },
];
const EXERCISE_MINUTES = [30, 45, 60, 90];
const EXERCISE_PER_WEEK = [3, 4, 5, 6];

type Step = 'fixed' | 'sleep' | 'exDo' | 'exKind' | 'exMin' | 'exFreq' | 'review';
const STEPS: Step[] = ['fixed', 'sleep', 'exDo', 'exKind', 'exMin', 'exFreq', 'review'];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

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

  // 고정 일정 입력 폼
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<DayIndex[]>([]);
  const [startText, setStartText] = useState('09:00');
  const [endText, setEndText] = useState('18:00');
  const [formError, setFormError] = useState('');

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

  function addFixed() {
    const start = parseTime(startText);
    const end = parseTime(endText);
    if (!title.trim()) return setFormError('일정 이름을 적어 주세요.');
    if (days.length === 0) return setFormError('요일을 하나 이상 골라 주세요.');
    if (start === null || end === null) return setFormError('시간은 숫자 4자리로 적어 주세요. 예: 0730');
    if (end <= start) return setFormError('끝나는 시간이 시작보다 늦어야 해요.');
    setFixed([...fixed, { id: String(Date.now()), title: title.trim(), days, start, end }]);
    setTitle('');
    setDays([]);
    setFormError('');
  }

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
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
          <Title>요일별 고정 일정</Title>
          <Sub>수업, 출근처럼 매주 반복되는 일정을 넣어 주세요. 없으면 건너뛰어도 됩니다.</Sub>
          {fixed.map((f) => (
            <Card key={f.id}>
              <Text style={st.itemTitle}>{f.title}</Text>
              <Text style={st.itemSub}>
                {[...f.days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(' ')} · {formatTime(f.start)}~
                {formatTime(f.end)}
              </Text>
              <Button kind="ghost" label="삭제" onPress={() => setFixed(fixed.filter((x) => x.id !== f.id))} />
            </Card>
          ))}
          <Card>
            <Input placeholder="일정 이름 (예: 출근)" value={title} onChangeText={setTitle} />
            <Row>
              {ALL_DAYS.map((d) => (
                <Chip key={d} label={DAY_LABELS[d]} on={days.includes(d)} onPress={() => setDays(toggle(days, d))} />
              ))}
            </Row>
            <Row>
              <TimeInput style={st.time} value={startText} onChange={setStartText} />
              <Text style={st.tilde}>~</Text>
              <TimeInput style={st.time} value={endText} onChange={setEndText} />
            </Row>
            {formError ? <Text style={st.error}>{formError}</Text> : null}
            <Button kind="ghost" label="+ 일정 추가" onPress={addFixed} />
          </Card>
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
                    style={[st.cell, cycles === o.cycles && st.cellOn, o.level === 'short' && { opacity: 0.55 }]}
                  >
                    <Text style={st.cellEmoji}>{o.level === 'good' ? '🙂' : o.level === 'ok' ? '😐' : '☹️'}</Text>
                    <Text style={st.cellTime}>{formatTime(o.wake)}</Text>
                    <Text style={st.cellSub}>
                      {o.cycles}사이클 · {o.sleepHours}시간
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Sub>🙂는 성인 권장 수면(7시간 이상)을 채우는 선택이에요.</Sub>
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
          <Title>주로 어떤 운동을 하나요?</Title>
          {EXERCISE_KINDS.map((k) => (
            <ChoiceBox
              key={k.label}
              label={k.label}
              hint={k.hint}
              on={exTypes.join('+') === k.types.join('+')}
              onPress={() => {
                setExTypes(k.types);
                go('exMin');
              }}
            />
          ))}
          <Sub>다른 운동이나 취미 운동은 나중에 대화로 추가할 수 있게 만들 예정이에요.</Sub>
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
  cellOn: { borderColor: colors.accent, backgroundColor: '#20263A' },
  cellEmoji: { fontSize: 20 },
  cellTime: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  cellSub: { color: colors.sub, marginTop: 4 },
});
