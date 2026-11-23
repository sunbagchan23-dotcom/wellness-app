// 데이터는 폰 안에만 저장합니다(서버, 로그인 없음)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Task } from './types';

const KEYS = {
  settings: 'settings-v1',
  tasks: 'tasks-v1',
  done: 'done-v1', // { "2026-11-23:fixed-a": true, ... }
};

async function load<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function save(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadSettings: () => load<Settings | null>(KEYS.settings, null),
  saveSettings: (s: Settings) => save(KEYS.settings, s),
  loadTasks: () => load<Task[]>(KEYS.tasks, []),
  saveTasks: (t: Task[]) => save(KEYS.tasks, t),
  loadDone: () => load<Record<string, boolean>>(KEYS.done, {}),
  saveDone: (d: Record<string, boolean>) => save(KEYS.done, d),
  resetAll: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};
