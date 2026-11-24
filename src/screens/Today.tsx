// 매일 쓰는 화면: 지금/다음 할 일, 요일별 시간표, 완료 체크, 할 일 던지기
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, kindColors, kindLabels } from '../theme';
import { Block, DAY_LABELS, DayIndex, SleepSetting, Task, WeekSchedule } from '../types';
import { formatTime, minutesNow } from '../time';
import { Button, Card, Chip, Input, Row, Sub, Title } from '../ui';

const TASK_MINUTES = [15, 30, 60, 90, 120];

export default function Today({
  week,
  sleep,
  today,
  isDone,
  onToggle,
  onAddTask,
  onDeleteTask,
  onEditSettings,
}: {
  week: WeekSchedule;
  sleep: SleepSetting;
  today: DayIndex;
  isDone: (day: DayIndex, block: Block) => boolean;
  onToggle: (day: DayIndex, block: Block) => void;
  onAddTask: (t: Omit<Task, 'id' | 'done'>) => void;
  onDeleteTask: (blockId: string) => void;
  onEditSettings: () => void;
}) {
  const [day, setDay] = useState<DayIndex>(today);
  const [now, setNow] = useState(minutesNow(new Date()));
  const [showConflicts, setShowConflicts] = useState(false);

  // 1분마다 "지금" 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(minutesNow(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const blocks = week.days[day].filter((b) => b.kind !== 'sleep');
  const current = day === today ? blocks.find((b) => b.start <= now && now < b.end) : undefined;
  const next = day === today ? blocks.find((b) => b.start > now) : undefined;

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <View style={st.header}>
        <Title>{day === today ? '오늘' : `${DAY_LABELS[day]}요일`}</Title>
        <Pressable onPress={onEditSettings}>
          <Text style={st.link}>설정 다시 하기</Text>
        </Pressable>
      </View>

      <Row>
        {([0, 1, 2, 3, 4, 5, 6] as DayIndex[]).map((d) => (
          <Chip key={d} label={d === today ? `${DAY_LABELS[d]}·오늘` : DAY_LABELS[d]} on={day === d} onPress={() => setDay(d)} />
        ))}
      </Row>

      <Text style={st.sleepLine}>
        매일 취침 {formatTime(sleep.bedtime)} · 기상 {formatTime(sleep.bedtime + Math.round(sleep.hours * 60))}
      </Text>

      {week.conflicts.length > 0 && (
        <Pressable onPress={() => setShowConflicts(!showConflicts)}>
          <Card>
            <Text style={{ color: colors.warn, fontWeight: '600' }}>
              조정이 필요한 일정 {week.conflicts.length}건 {showConflicts ? '▲' : '▼'}
            </Text>
            {showConflicts &&
              week.conflicts.map((c, i) => (
                <Text key={i} style={st.conflict}>
                  · {c.message}
                </Text>
              ))}
          </Card>
        </Pressable>
      )}

      {day === today && (
        <Card>
          <Text style={st.nowLabel}>지금</Text>
          <Text style={st.nowTitle}>{current ? current.title : '비어 있는 시간'}</Text>
          {next && (
            <Text style={st.nextText}>
              다음 · {formatTime(next.start)} {next.title}
            </Text>
          )}
        </Card>
      )}

      {blocks.length === 0 && <Sub>이 날은 일정이 없어요.</Sub>}
      {blocks.map((b) => {
        const done = isDone(day, b);
        const isNow = b === current;
        return (
          <Pressable key={b.id} onPress={() => onToggle(day, b)} onLongPress={() => b.kind === 'task' && onDeleteTask(b.id)}>
            <View style={[st.block, { borderLeftColor: kindColors[b.kind] }, isNow && st.blockNow]}>
              <View style={[st.check, done && st.checkOn]}>{done && <Text style={st.checkMark}>✓</Text>}</View>
              <View style={{ flex: 1 }}>
                <Text style={[st.blockTitle, done && st.doneText]}>{b.title}</Text>
                <Text style={st.blockSub}>
                  {formatTime(b.start)}~{formatTime(b.end)} · {kindLabels[b.kind]}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
      <Sub>항목을 누르면 완료 체크, 할 일은 길게 누르면 삭제됩니다.</Sub>

      <AddTask today={today} onAdd={onAddTask} />
    </ScrollView>
  );
}

function AddTask({ today, onAdd }: { today: DayIndex; onAdd: (t: Omit<Task, 'id' | 'done'>) => void }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [day, setDay] = useState<DayIndex | null>(null);

  return (
    <Card>
      <Text style={st.addTitle}>할 일 던지기</Text>
      <Input placeholder="무엇을? (예: 보고서 초안)" value={title} onChangeText={setTitle} />
      <Row>
        {TASK_MINUTES.map((m) => (
          <Chip key={m} label={`${m}분`} on={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </Row>
      <Row>
        <Chip label="알아서" on={day === null} onPress={() => setDay(null)} />
        {([0, 1, 2, 3, 4, 5, 6] as DayIndex[])
          .filter((d) => d >= today)
          .map((d) => (
            <Chip key={d} label={DAY_LABELS[d]} on={day === d} onPress={() => setDay(d)} />
          ))}
      </Row>
      <Button
        label="시간표에 넣기"
        disabled={!title.trim()}
        onPress={() => {
          onAdd({ title: title.trim(), minutes, day });
          setTitle('');
        }}
      />
    </Card>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.accent },
  sleepLine: { color: colors.sub, marginBottom: 10, marginTop: 2 },
  conflict: { color: colors.sub, marginTop: 6, lineHeight: 20 },
  nowLabel: { color: colors.sub, fontSize: 13 },
  nowTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 },
  nextText: { color: colors.sub, marginTop: 6 },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  blockNow: { borderWidth: 1, borderColor: colors.accent },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.done, borderColor: colors.done },
  checkMark: { color: colors.bg, fontWeight: '800' },
  blockTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  blockSub: { color: colors.sub, marginTop: 2 },
  doneText: { textDecorationLine: 'line-through', color: colors.sub },
  addTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
});
