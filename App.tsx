// 앱의 시작점: 저장된 설정이 없으면 온보딩, 있으면 오늘 화면
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { buildWeek } from './src/scheduler';
import Onboarding from './src/screens/Onboarding';
import Today from './src/screens/Today';
import { DoneLog, storage } from './src/storage';
import { colors } from './src/theme';
import { Block, DayIndex, Settings, Task } from './src/types';
import { dateKey, dayIndexOf } from './src/time';

/** 이번 주(월요일 시작)에서 d요일의 날짜 */
function dateOfWeekday(d: DayIndex): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + (d - dayIndexOf(now)));
  return result;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [done, setDone] = useState<DoneLog>({});
  const [noticeSeen, setNoticeSeen] = useState(true);
  const [editing, setEditing] = useState(false);
  const today = dayIndexOf(new Date());

  useEffect(() => {
    (async () => {
      setSettings(await storage.loadSettings());
      setTasks(await storage.loadTasks());
      setDone(await storage.loadDone());
      setNoticeSeen(await storage.loadNoticeSeen());
      setLoading(false);
    })();
  }, []);

  const week = useMemo(() => (settings ? buildWeek(settings, tasks, today) : null), [settings, tasks, today]);

  function updateTasks(next: Task[]) {
    setTasks(next);
    storage.saveTasks(next);
  }

  function isDone(day: DayIndex, block: Block) {
    if (block.kind === 'task') return tasks.find((t) => `task-${t.id}` === block.id)?.done ?? false;
    return !!done[`${dateKey(dateOfWeekday(day))}:${block.id}`];
  }

  function toggle(day: DayIndex, block: Block) {
    if (block.kind === 'task') {
      // 완료한 할 일은 그 요일에 고정해서, 다른 할 일이 추가돼도 자리가 바뀌지 않게
      updateTasks(
        tasks.map((t) =>
          `task-${t.id}` === block.id ? { ...t, done: !t.done, doneAt: t.done ? undefined : Date.now(), day } : t,
        ),
      );
      return;
    }
    const key = `${dateKey(dateOfWeekday(day))}:${block.id}`;
    const next = { ...done };
    if (next[key]) delete next[key];
    else next[key] = Date.now(); // 완료한 시각을 남김
    setDone(next);
    storage.saveDone(next);
  }

  let screen;
  if (loading) {
    screen = <ActivityIndicator style={{ marginTop: 80 }} color={colors.accent} />;
  } else if (!settings || editing) {
    screen = (
      <Onboarding
        initial={settings}
        onDone={(s) => {
          setSettings(s);
          storage.saveSettings(s);
          setEditing(false);
        }}
      />
    );
  } else {
    screen = (
      <Today
        week={week!}
        sleep={settings.sleep}
        today={today}
        isDone={isDone}
        onToggle={toggle}
        onAddTask={(t) => updateTasks([...tasks, { ...t, id: String(Date.now()), done: false }])}
        onDeleteTask={(blockId) => updateTasks(tasks.filter((t) => `task-${t.id}` !== blockId))}
        onEditSettings={() => setEditing(true)}
        showNotice={!noticeSeen}
        onDismissNotice={() => {
          setNoticeSeen(true);
          storage.saveNoticeSeen();
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <View style={styles.root}>{screen}</View>
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
