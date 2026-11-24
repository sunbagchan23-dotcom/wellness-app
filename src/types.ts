// 앱 전체에서 쓰는 데이터 모양 정의
// 시간은 모두 "자정부터 몇 분"으로 저장합니다. 예: 07:30 → 450
// 요일은 0=월, 1=화, ... 6=일

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 수업, 출근처럼 매주 같은 요일·시간에 반복되는 고정 일정 */
export interface FixedEvent {
  id: string;
  title: string;
  days: DayIndex[];
  start: number; // 분
  end: number; // 분
}

export interface SleepSetting {
  bedtime: number; // 취침 시각(분)
  hours: number; // 누워 있는 시간(잠드는 시간 포함). 시간표에서 이만큼 막음
  cycles?: number; // 선택한 수면 사이클 수
}

export interface ExerciseSetting {
  enabled: boolean;
  types: string[]; // 예: ['러닝', '헬스']
  minutes: number; // 1회 운동 시간
  days: DayIndex[]; // 운동하는 요일 (perWeek에서 앱이 정함)
  perWeek?: number; // 주 몇 회
  items?: { type: string; minutes: number }[]; // 운동별 1회 시간 (예: 러닝 30분, 헬스 60분). 있으면 이걸 우선
}

/** "던져 놓는" 할 일. 앱이 빈 시간에 알아서 배치 */
export interface Task {
  id: string;
  title: string;
  minutes: number;
  day: DayIndex | null; // null이면 앱이 가장 빠른 빈 날에 배치
  done: boolean;
  doneAt?: number; // 완료한 시각(ms)
}

export interface Settings {
  fixed: FixedEvent[];
  sleep: SleepSetting;
  exercise: ExerciseSetting;
}

export type BlockKind = 'sleep' | 'fixed' | 'exercise' | 'task';

/** 시간표 한 칸 */
export interface Block {
  id: string;
  title: string;
  kind: BlockKind;
  start: number;
  end: number;
}

export interface Conflict {
  day: DayIndex | null;
  message: string;
}

export interface WeekSchedule {
  days: Block[][]; // 길이 7, 각 요일의 블록(시작 시각 순)
  conflicts: Conflict[];
}
