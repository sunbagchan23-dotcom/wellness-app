// 주간 격자(요일 × 30분 칸) ↔ 고정 일정 변환
// 격자의 각 칸에는 "붓"(출근, 수업 같은 이름) id가 들어가거나 비어 있습니다.

import { DayIndex, FixedEvent } from './types';

export const GRID_START = 6 * 60; // 06:00
export const GRID_END = 24 * 60; // 24:00
export const SLOT_MIN = 30;
export const SLOT_COUNT = (GRID_END - GRID_START) / SLOT_MIN; // 36칸

export interface Brush {
  id: string;
  title: string;
  color: string;
}

/** grid[요일][칸] = 붓 id 또는 null */
export type Grid = (string | null)[][];

export function emptyGrid(): Grid {
  return Array.from({ length: 7 }, () => Array<string | null>(SLOT_COUNT).fill(null));
}

export function slotStart(slot: number): number {
  return GRID_START + slot * SLOT_MIN;
}

/** 격자 → 고정 일정. 같은 이름·같은 시간대는 요일을 묶어 하나의 일정으로 */
export function gridToEvents(grid: Grid, brushes: Brush[]): FixedEvent[] {
  const byKey = new Map<string, FixedEvent>();
  for (let d = 0; d < 7; d++) {
    let s = 0;
    while (s < SLOT_COUNT) {
      const id = grid[d][s];
      if (!id) {
        s++;
        continue;
      }
      let e = s;
      while (e < SLOT_COUNT && grid[d][e] === id) e++;
      const brush = brushes.find((b) => b.id === id);
      const start = slotStart(s);
      const end = slotStart(e);
      const key = `${id}|${start}|${end}`;
      const existing = byKey.get(key);
      if (existing) existing.days.push(d as DayIndex);
      else
        byKey.set(key, {
          id: key,
          title: brush?.title ?? '일정',
          days: [d as DayIndex],
          start,
          end,
        });
      s = e;
    }
  }
  return [...byKey.values()].sort((a, b) => a.days[0] - b.days[0] || a.start - b.start);
}

/** 기존 고정 일정 → 격자 + 붓 (다시 설정할 때 이전 내용을 칠해 둔 상태로 시작) */
export function eventsToGrid(events: FixedEvent[], palette: string[]): { grid: Grid; brushes: Brush[] } {
  const grid = emptyGrid();
  const brushes: Brush[] = [];
  for (const ev of events) {
    let brush = brushes.find((b) => b.title === ev.title);
    if (!brush) {
      brush = { id: `b${brushes.length}`, title: ev.title, color: palette[brushes.length % palette.length] };
      brushes.push(brush);
    }
    for (const d of ev.days) {
      for (let s = 0; s < SLOT_COUNT; s++) {
        const t = slotStart(s);
        if (t >= ev.start && t < ev.end) grid[d][s] = brush.id;
      }
    }
  }
  return { grid, brushes };
}

/** 드래그로 칠하기: from 칸에서 to 칸까지 사각형 범위를 value로 채움 */
export function paintRect(
  grid: Grid,
  from: { day: number; slot: number },
  to: { day: number; slot: number },
  value: string | null,
): Grid {
  const next = grid.map((col) => [...col]);
  const [d0, d1] = [Math.min(from.day, to.day), Math.max(from.day, to.day)];
  const [s0, s1] = [Math.min(from.slot, to.slot), Math.max(from.slot, to.slot)];
  for (let d = d0; d <= d1; d++) for (let s = s0; s <= s1; s++) next[d][s] = value;
  return next;
}
