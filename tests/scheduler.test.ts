/// <reference types="node" />
// 시간표 규칙 테스트. 실행: npm test
import assert from 'node:assert/strict';
import { buildWeek, sleepIntervals, wakeTime } from '../src/scheduler';
import { Settings } from '../src/types';
import { formatTime, parseTime } from '../src/time';

const t = (s: string) => parseTime(s)!;

const base: Settings = {
  fixed: [{ id: 'a', title: '수업', days: [0, 2, 4], start: t('09:00'), end: t('12:00') }],
  sleep: { bedtime: t('23:00'), hours: 8 },
  exercise: { enabled: true, types: ['러닝', '헬스'], minutes: 60, days: [0, 1, 2, 3, 4] },
};

// 수면
assert.equal(formatTime(wakeTime(t('23:00'), 8)), '07:00');
assert.deepEqual(sleepIntervals(t('23:00'), 8), [{ start: 0, end: 420 }, { start: 1380, end: 1440 }]);
assert.deepEqual(sleepIntervals(t('01:00'), 8), [{ start: 60, end: 540 }]);

// 월요일: 수업 09~12 → 운동은 07:30~08:30 (기상 07:00 + 30분)
let w = buildWeek(base, [], 0);
const mon = w.days[0];
const ex = mon.find((b) => b.kind === 'exercise')!;
assert.equal(formatTime(ex.start), '07:30');
assert.equal(w.conflicts.length, 0);

// 수업이 07:30부터면 운동은 오후로 밀리고 알림
w = buildWeek({ ...base, fixed: [{ ...base.fixed[0], start: t('07:30') }] }, [], 0);
const ex2 = w.days[0].find((b) => b.kind === 'exercise')!;
assert.equal(formatTime(ex2.start), '12:00');
assert.ok(w.conflicts.some((c) => c.message.includes('오전에 운동할 자리가 없어')));

// 고정 일정끼리 겹침, 수면과 겹침
w = buildWeek(
  {
    ...base,
    fixed: [
      ...base.fixed,
      { id: 'b', title: '알바', days: [0], start: t('11:00'), end: t('13:00') },
      { id: 'c', title: '야간', days: [1], start: t('22:00'), end: t('23:30') },
    ],
  },
  [],
  0,
);
assert.ok(w.conflicts.some((c) => c.message.includes('겹칩니다') && c.day === 0));
assert.ok(w.conflicts.some((c) => c.message.includes('수면 시간과') && c.day === 1));

// 할 일: 요일 없으면 오늘(수요일=2)부터 가장 빠른 빈칸
w = buildWeek(base, [{ id: 'x', title: '보고서', minutes: 90, day: null, done: false }], 2);
const task = w.days[2].find((b) => b.kind === 'task')!;
assert.equal(formatTime(task.start), '12:00'); // 08:30~09:00은 30분뿐이라 수업(09~12) 뒤로
assert.ok(w.days[0].every((b) => b.kind !== 'task'));

// 할 일이 너무 길면 충돌
w = buildWeek(base, [{ id: 'y', title: '대청소', minutes: 20 * 60, day: 6, done: false }], 0);
assert.ok(w.conflicts.some((c) => c.message.includes('대청소')));

console.log('시간표 규칙 테스트 모두 통과');
