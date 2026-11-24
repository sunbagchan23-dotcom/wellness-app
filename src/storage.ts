// 데이터는 폰 안에만 저장합니다(서버, 로그인 없음)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Task } from './types';

/** 완료 기록: 키 → 완료한 시각(ms). 나중에 적응형 조정·과거 비교에 씀 */
export type DoneLog = Record<string, number | boolean>;

const KEYS = {
  settings: 'settings-v1',
  tasks: 'tasks-v1',
  done: 'done-v1', // { "2026-11-23:fixed-a": 완료한 시각(ms), ... } (예전 버전은 true)
  notice: 'notice-v1', // 트레이너 첫 공지를 봤는지
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
  loadDone: () => load<DoneLog>(KEYS.done, {}),
  saveDone: (d: DoneLog) => save(KEYS.done, d),
  loadNoticeSeen: () => load<boolean>(KEYS.notice, false),
  saveNoticeSeen: () => save(KEYS.notice, true),
  resetAll: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};
