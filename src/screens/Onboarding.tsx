// 처음 설정: ① 고정 일정 → ② 수면 → ③ 운동 → ④ 확인
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildWeek, RECOMMENDED_SLEEP_HOURS, wakeTime } from '../scheduler';
import { colors } from '../theme';
import { DAY_LABELS, DayIndex, FixedEvent, Settings } from '../types';
import { formatTime, parseTime } from '../time';
import { Button, Card, Chip, Input, Row, Sub, Title } from '../ui';

const ALL_DAYS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];
const EXERCISE_TYPES = ['러닝', '헬스', '요가', '수영', '자전거'];
const EXERCISE_MINUTES = [30, 45, 60, 90];

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
  const [step, setStep] = useState(0);
  const [fixed, setFixed] = useState<FixedEvent[]>(initial?.fixed ?? []);
  const [sleepHours, setSleepHours] = useState(initial?.sleep.hours ?? 8);
  const [bedText, setBedText] = useState(initial ? formatTime(initial.sleep.bedtime) : '23:00');
  const [exOn, setExOn] = useState(initial?.exercise.enabled ?? true);
  const [exTypes, setExTypes] = useState<string[]>(initial?.exercise.types ?? ['러닝', '헬스']);
  const [exMin, setExMin] = useState(initial?.exercise.minutes ?? 60);
  const [exDays, setExDays] = useState<DayIndex[]>(initial?.exercise.days ?? [0, 1, 2, 3, 4]);

  // 고정 일정 입력 폼
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<DayIndex[]>([]);
  const [startText, setStartText] = useState('09:00');
  const [endText, setEndText] = useState('18:00');
  const [formError, setFormError] = useState('');

  const bedtime = parseTime(bedText);

  const settings = (): Settings => ({
    fixed,
    sleep: { bedtime: bedtime ?? 23 * 60, hours: sleepHours },
    exercise: { enabled: exOn, types: exTypes, minutes: exMin, days: exDays },
  });

  function addFixed() {
    const start = parseTime(startText);
    const end = parseTime(endText);
    if (!title.trim()) return setFormError('일정 이름을 적어 주세요.');
    if (days.length === 0) return setFormError('요일을 하나 이상 골라 주세요.');
    if (start === null || end === null) return setFormError('시간은 07:30처럼 적어 주세요.');
    if (end <= start) return setFormError('끝나는 시간이 시작보다 늦어야 해요.');
    setFixed([...fixed, { id: String(Date.now()), title: title.trim(), days, start, end }]);
    setTitle('');
    setDays([]);
    setFormError('');
  }

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <Text style={st.step}>{step + 1} / 4</Text>

      {step === 0 && (
        <>
          <Title>요일별 고정 일정</Title>
          <Sub>수업, 출근처럼 매주 반복되는 일정을 넣어 주세요. 없으면 건너뛰어도 됩니다.</Sub>
          {fixed.map((f) => (
            <Card key={f.id}>
              <Text style={st.itemTitle}>{f.title}</Text>
              <Text style={st.itemSub}>
                {[...f.days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(' ')} · {formatTime(f.start)}~{formatTime(f.end)}
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
              <Input style={st.time} value={startText} onChangeText={setStartText} placeholder="09:00" />
              <Text style={st.tilde}>~</Text>
              <Input style={st.time} value={endText} onChangeText={setEndText} placeholder="18:00" />
            </Row>
            {formError ? <Text style={st.error}>{formError}</Text> : null}
            <Button kind="ghost" label="+ 일정 추가" onPress={addFixed} />
          </Card>
          <Button label="다음: 수면" onPress={() => setStep(1)} />
        </>
      )}

      {step === 1 && (
        <>
          <Title>수면</Title>
          <Sub>성인 권장 수면은 7~9시간입니다. 원하는 수면 시간과 취침 시각을 고르면 기상 시각을 계산해 드려요.</Sub>
          <Row>
            {RECOMMENDED_SLEEP_HOURS.map((h) => (
              <Chip key={h} label={`${h}시간`} on={sleepHours === h} onPress={() => setSleepHours(h)} />
            ))}
          </Row>
          <Text style={st.label}>취침 시각</Text>
          <Input value={bedText} onChangeText={setBedText} placeholder="23:00" />
          {bedtime === null ? (
            <Text style={st.error}>시간은 23:00처럼 적어 주세요.</Text>
          ) : (
            <Card>
              <Text style={st.big}>기상 {formatTime(wakeTime(bedtime, sleepHours))}</Text>
            </Card>
          )}
          <Button label="다음: 운동" disabled={bedtime === null} onPress={() => setStep(2)} />
          <Button kind="ghost" label="이전" onPress={() => setStep(0)} />
        </>
      )}

      {step === 2 && (
        <>
          <Title>운동</Title>
          <Row>
            <Chip label="운동함" on={exOn} onPress={() => setExOn(true)} />
            <Chip label="안 함" on={!exOn} onPress={() => setExOn(false)} />
          </Row>
          {exOn && (
            <>
              <Text style={st.label}>종류</Text>
              <Row>
                {EXERCISE_TYPES.map((t) => (
                  <Chip key={t} label={t} on={exTypes.includes(t)} onPress={() => setExTypes(toggle(exTypes, t))} />
                ))}
              </Row>
              <Text style={st.label}>1회 시간</Text>
              <Row>
                {EXERCISE_MINUTES.map((m) => (
                  <Chip key={m} label={`${m}분`} on={exMin === m} onPress={() => setExMin(m)} />
                ))}
              </Row>
              <Text style={st.label}>요일</Text>
              <Row>
                {ALL_DAYS.map((d) => (
                  <Chip key={d} label={DAY_LABELS[d]} on={exDays.includes(d)} onPress={() => setExDays(toggle(exDays, d))} />
                ))}
              </Row>
              <Sub>운동 시간대는 다른 일정을 확인한 뒤, 기상 30분 뒤부터 오전 중 빈 시간에 먼저 넣습니다.</Sub>
            </>
          )}
          <Button label="다음: 확인" onPress={() => setStep(3)} />
          <Button kind="ghost" label="이전" onPress={() => setStep(1)} />
        </>
      )}

      {step === 3 && <Review settings={settings()} onBack={() => setStep(2)} onDone={() => onDone(settings())} />}
    </ScrollView>
  );
}

function Review({ settings, onBack, onDone }: { settings: Settings; onBack: () => void; onDone: () => void }) {
  const week = buildWeek(settings, [], 0);
  return (
    <View>
      <Title>확인</Title>
      {week.conflicts.length === 0 ? (
        <Sub>충돌 없이 시간표를 만들 수 있어요.</Sub>
      ) : (
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
      <Button kind="ghost" label="이전" onPress={onBack} />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  step: { color: colors.sub, marginBottom: 8 },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemSub: { color: colors.sub, marginTop: 4 },
  time: { width: 100 },
  tilde: { color: colors.sub, marginHorizontal: 8, marginBottom: 8 },
  error: { color: colors.warn, marginBottom: 8 },
  label: { color: colors.text, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  big: { color: colors.text, fontSize: 22, fontWeight: '700' },
});
