// 매일 쓰는 화면: 위에 한 주 시간표(누르면 완료 체크), 아래에 할 일 던지기
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, kindColors, kindLabels } from '../theme';
import { Block, DAY_LABELS, DayIndex, SleepSetting, Task, WeekSchedule } from '../types';
import { formatTime, minutesNow } from '../time';
import { Button, Card, Chip, Input, Row, Sub, Title } from '../ui';
import WeekTimetable from './WeekTimetable';

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
  showNotice,
  onDismissNotice,
}: {
  week: WeekSchedule;
  sleep: SleepSetting;
  today: DayIndex;
  isDone: (day: DayIndex, block: Block) => boolean;
  onToggle: (day: DayIndex, block: Block) => void;
  onAddTask: (t: Omit<Task, 'id' | 'done'>) => void;
  onDeleteTask: (blockId: string) => void;
  onEditSettings: () => void;
  showNotice: boolean;
  onDismissNotice: () => void;
}) {
  const [now, setNow] = useState(minutesNow(new Date()));
  const [showConflicts, setShowConflicts] = useState(false);

  // 1분마다 "지금" 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(minutesNow(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const blocks = week.days[today].filter((b) => b.kind !== 'sleep');
  // 겹친 경우(근무 중 점심 등) 더 늦게 시작한 블록이 '지금'
  const current = blocks.filter((b) => b.start <= now && now < b.end).pop();
  const next = blocks.find((b) => b.start > now);
  const wake = (sleep.bedtime + Math.round(sleep.hours * 60)) % 1440;

  return (
    <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
      <View style={st.header}>
        <Title>이번 주</Title>
        <Pressable onPress={onEditSettings}>
          <Text style={st.link}>설정 다시 하기</Text>
        </Pressable>
      </View>

      {showNotice && (
        <View style={st.notice}>
          <Text style={st.noticeTitle}>이건 이상적인 시간표입니다.</Text>
          <Text style={st.noticeBody}>
            그대로 따라오면 당신은 대단한 사람이 됩니다. 당신이 따라오는 만큼, 제가 앞으로의 스케줄을 맞춰 갑니다.
          </Text>
          <Pressable onPress={onDismissNotice} style={st.noticeBtn}>
            <Text style={st.noticeBtnText}>시작하기</Text>
          </Pressable>
        </View>
      )}

      <Text style={st.sleepLine}>
        매일 취침 {formatTime(sleep.bedtime)} · 기상 {formatTime(wake)}
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

      <View style={st.nowRow}>
        <Text style={st.nowLabel}>지금</Text>
        <Text style={st.nowTitle} numberOfLines={1}>
          {current ? current.title : '빈 시간'}
        </Text>
        {next && (
          <Text style={st.nextText} numberOfLines={1}>
            다음 {formatTime(next.start)} {next.title}
          </Text>
        )}
      </View>

      <WeekTimetable
        week={week}
        today={today}
        now={now}
        wake={wake}
        bedtime={sleep.bedtime}
        isDone={isDone}
        onToggle={onToggle}
        onDeleteTask={onDeleteTask}
      />
      <Sub>블록을 누르면 완료, 할 일은 길게 누르면 삭제됩니다.</Sub>

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
  notice: { backgroundColor: '#1C2340', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.accent },
  noticeTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  noticeBody: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 8 },
  noticeBtn: { marginTop: 14, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  noticeBtnText: { color: colors.bg, fontWeight: '800', fontSize: 16 },
  sleepLine: { color: colors.sub, marginBottom: 10, marginTop: 2 },
  conflict: { color: colors.sub, marginTop: 6, lineHeight: 20 },
  nowRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  nowLabel: { color: colors.sub, fontSize: 13, marginRight: 8 },
  nowTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginRight: 10, flexShrink: 1 },
  nextText: { color: colors.sub, fontSize: 13, flexShrink: 1 },
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
