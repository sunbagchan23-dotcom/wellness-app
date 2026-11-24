// 시간표를 만드는 규칙 (LLM 없이, 매번 같은 입력이면 같은 결과)
//
// 순서:
// 1) 수면 시간을 막는다
// 2) 고정 일정을 넣고, 수면이나 다른 고정 일정과 겹치면 충돌로 알린다
// 3) 운동: 기상 30분 뒤 ~ 정오 사이 빈칸에 먼저 넣고, 없으면 그날 아무 빈칸, 그래도 없으면 충돌
// 4) 할 일: 정한 요일이 있으면 그날, 없으면 오늘부터 가장 빠른 빈칸에 넣는다. 자리가 없으면 충돌

import { Block, Conflict, DayIndex, DAY_LABELS, Settings, Task, WeekSchedule } from './types';
import { formatTime } from './time';

const MORNING_BUFFER = 30; // 기상 후 준비 시간(분)
const MORNING_END = 12 * 60;
const DAY_END = 24 * 60;

const MEALS = [
  { id: 'lunch', title: '점심', minutes: 60, from: 11 * 60 + 30, ideal: 12 * 60, to: 14 * 60 },
  { id: 'dinner', title: '저녁', minutes: 60, from: 18 * 60, ideal: 18 * 60 + 30, to: 21 * 60 },
];

interface Interval {
  start: number;
  end: number;
}

/** 기상 시각(분) */
export function wakeTime(bedtime: number, hours: number): number {
  return (bedtime + Math.round(hours * 60)) % DAY_END;
}

/** 하루 안에서 수면이 차지하는 구간들 */
export function sleepIntervals(bedtime: number, hours: number): Interval[] {
  const wake = wakeTime(bedtime, hours);
  if (bedtime > wake) {
    // 자정을 넘기는 수면 (예: 23:00 ~ 07:00)
    return [
      { start: 0, end: wake },
      { start: bedtime, end: DAY_END },
    ];
  }
  // 자정 이후에 자는 경우 (예: 01:00 ~ 09:00)
  return [{ start: bedtime, end: wake }];
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** [from, to) 범위에서 busy와 겹치지 않는 첫 minutes분짜리 자리 */
function findSlot(busy: Interval[], minutes: number, from: number, to: number): Interval | null {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  let cursor = from;
  for (const b of sorted) {
    if (b.end <= cursor) continue;
    if (b.start >= to) break;
    if (b.start - cursor >= minutes) return { start: cursor, end: cursor + minutes };
    cursor = Math.max(cursor, b.end);
  }
  if (to - cursor >= minutes) return { start: cursor, end: cursor + minutes };
  return null;
}

/** 깨어 있는 시간 범위. 수면이 자정을 넘기면 [기상+버퍼, 취침), 아니면 단순화해서 [기상+버퍼, 24:00) */
function awakeRange(settings: Settings): Interval {
  const { bedtime, hours } = settings.sleep;
  const wake = wakeTime(bedtime, hours);
  const start = wake + MORNING_BUFFER;
  const end = bedtime > wake ? bedtime : DAY_END;
  return { start, end };
}

export function buildWeek(settings: Settings, tasks: Task[], today: DayIndex): WeekSchedule {
  const days: Block[][] = [[], [], [], [], [], [], []];
  const conflicts: Conflict[] = [];
  const { bedtime, hours } = settings.sleep;
  const sleep = sleepIntervals(bedtime, hours);
  const awake = awakeRange(settings);

  for (let d = 0 as DayIndex; d < 7; d = (d + 1) as DayIndex) {
    const day = days[d];
    sleep.forEach((s, i) =>
      day.push({ id: `sleep-${i}`, title: '수면', kind: 'sleep', start: s.start, end: s.end }),
    );

    // 고정 일정
    for (const ev of settings.fixed) {
      if (!ev.days.includes(d)) continue;
      const iv = { start: ev.start, end: ev.end };
      if (sleep.some((s) => overlaps(s, iv))) {
        conflicts.push({ day: d, message: `${DAY_LABELS[d]}요일 "${ev.title}"이(가) 수면 시간과 겹칩니다.` });
      }
      for (const other of day) {
        if (other.kind === 'fixed' && overlaps(other, iv)) {
          conflicts.push({
            day: d,
            message: `${DAY_LABELS[d]}요일 "${ev.title}"과(와) "${other.title}"이(가) 겹칩니다.`,
          });
        }
      }
      day.push({ id: `fixed-${ev.id}`, title: ev.title, kind: 'fixed', start: ev.start, end: ev.end });
    }

    // 운동
    const ex = settings.exercise;
    if (ex.enabled && ex.days.includes(d)) {
      // 운동별 시간이 있으면 연달아 배치 (예: 러닝 30분 → 헬스 60분)
      const items = ex.items?.length
        ? ex.items
        : [{ type: ex.types.length ? ex.types.join(' + ') : '운동', minutes: ex.minutes }];
      const total = items.reduce((sum, it) => sum + it.minutes, 0);
      const slot =
        findSlot(day, total, awake.start, Math.min(MORNING_END, awake.end)) ??
        findSlot(day, total, awake.start, awake.end);
      if (slot) {
        let cursor = slot.start;
        items.forEach((it, i) => {
          day.push({
            id: items.length > 1 ? `exercise-${i}` : 'exercise',
            title: it.type,
            kind: 'exercise',
            start: cursor,
            end: cursor + it.minutes,
          });
          cursor += it.minutes;
        });
        if (slot.start >= MORNING_END) {
          conflicts.push({
            day: d,
            message: `${DAY_LABELS[d]}요일은 오전에 운동할 자리가 없어 ${formatTime(slot.start)}에 넣었습니다.`,
          });
        }
      } else {
        conflicts.push({ day: d, message: `${DAY_LABELS[d]}요일에는 운동 ${total}분을 넣을 자리가 없습니다.` });
      }
    }
  }

  // 식사: 점심·저녁을 앱이 매일 넣는다.
  // 시간대 안의 빈칸을 먼저 찾고, 없으면(예: 근무 중 점심) 기준 시각에 고정 일정 위에 겹쳐 넣는다.
  for (let d = 0 as DayIndex; d < 7; d = (d + 1) as DayIndex) {
    for (const meal of MEALS) {
      const from = Math.max(meal.from, awake.start);
      const to = Math.min(meal.to, awake.end);
      if (to - from < meal.minutes) continue; // 깨어 있는 시간 밖이면 생략
      const busy = days[d].filter((b) => b.kind !== 'fixed'); // 고정 일정과는 겹쳐도 됨
      const free =
        findSlot(days[d], meal.minutes, Math.max(meal.ideal, from), to) ?? findSlot(days[d], meal.minutes, from, to);
      const overlay = findSlot(busy, meal.minutes, Math.max(meal.ideal, from), to) ?? findSlot(busy, meal.minutes, from, to);
      const slot = free ?? overlay;
      if (slot) days[d].push({ id: meal.id, title: meal.title, kind: 'meal', ...slot });
    }
  }

  // 할 일: 요일이 정해진 것 먼저, 그다음 입력 순서대로
  const ordered = [...tasks.filter((t) => t.day !== null), ...tasks.filter((t) => t.day === null)];
  for (const task of ordered) {
    const candidates: DayIndex[] =
      task.day !== null
        ? [task.day]
        : ([0, 1, 2, 3, 4, 5, 6].filter((d) => d >= today) as DayIndex[]);
    let placed = false;
    for (const d of candidates) {
      const slot = findSlot(days[d], task.minutes, awake.start, awake.end);
      if (slot) {
        days[d].push({ id: `task-${task.id}`, title: task.title, kind: 'task', ...slot });
        placed = true;
        break;
      }
    }
    if (!placed) {
      conflicts.push({
        day: task.day,
        message:
          task.day !== null
            ? `${DAY_LABELS[task.day]}요일에 "${task.title}"(${task.minutes}분)을 넣을 자리가 없습니다.`
            : `이번 주 남은 날에 "${task.title}"(${task.minutes}분)을 넣을 자리가 없습니다.`,
      });
    }
  }

  days.forEach((day) => day.sort((a, b) => a.start - b.start));
  return { days, conflicts };
}

/** 주 n회 운동을 요일에 고르게 나눔 (월=0) */
export function exerciseDaysFor(perWeek: number): DayIndex[] {
  const patterns: Record<number, DayIndex[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return patterns[Math.min(7, Math.max(1, Math.round(perWeek)))];
}
