import { DayIndex } from './types';

/** "07:30" → 450. 형식이 틀리면 null */
export function parseTime(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** 450 → "07:30" (24시 이상은 다음 날로 넘겨서 표시) */
export function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 자바스크립트 Date → 월요일=0 요일 번호 */
export function dayIndexOf(date: Date): DayIndex {
  return ((date.getDay() + 6) % 7) as DayIndex;
}

/** 날짜를 "2026-11-23" 문자열로 (완료 체크 기록용) */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function minutesNow(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** 숫자만 받아 "HH:MM" 모양으로. 예: "2300" → "23:00", "73" → "73" (입력 중) */
export function formatTimeDigits(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}
