/// <reference types="node" />
// 시간표 규칙 테스트. 실행: npm test
import assert from 'node:assert/strict';
import { buildWeek, exerciseDaysFor, sleepIntervals, wakeTime } from '../src/scheduler';
import { sleepOptions } from '../src/sleep';
import { clearRun, emptyGrid, eventsToGrid, gridToEvents, paintRect } from '../src/fixedGrid';
import { Settings } from '../src/types';
import { formatTime, formatTimeDigits, parseTime } from '../src/time';

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
assert.equal(formatTime(task.start), '13:00'); // 08:30~09:00은 짧고, 수업(09~12)·점심(12~13) 뒤로
assert.ok(w.days[0].every((b) => b.kind !== 'task'));

// 할 일이 너무 길면 충돌
w = buildWeek(base, [{ id: 'y', title: '대청소', minutes: 20 * 60, day: 6, done: false }], 0);
assert.ok(w.conflicts.some((c) => c.message.includes('대청소')));

// 시간 입력: 숫자만 쳐도 ":" 자동
assert.equal(formatTimeDigits('2300'), '23:00');
assert.equal(formatTimeDigits('730'), '73:0');
assert.equal(formatTimeDigits('0730'), '07:30');
assert.equal(formatTimeDigits('23'), '23');
assert.equal(formatTimeDigits('23:0'), '23:0');
assert.equal(formatTimeDigits('240000'), '24:00');

// 수면 사이클: 23:00 취침 → sleepytime.cc와 같은 결과
const opts = sleepOptions(t('23:00'));
assert.deepEqual(opts.map((o) => formatTime(o.wake)), ['03:45', '05:15', '06:45', '08:15']);
assert.deepEqual(opts.map((o) => o.level), ['short', 'ok', 'good', 'good']);
assert.equal(opts[2].inBedHours, 7.75);
// 선택한 사이클로 시간표의 기상 시각이 맞게 나옴
assert.equal(formatTime(wakeTime(t('23:00'), opts[2].inBedHours)), '06:45');

// 운동 주 n회 → 요일 자동 배분
assert.deepEqual(exerciseDaysFor(3), [0, 2, 4]);
assert.equal(exerciseDaysFor(6).length, 6);

// 격자 칠하기: 월~금 09:00~18:00을 한 번에 드래그 (09:00 = 6번째 칸, 18:00 직전 = 23번째 칸)
const brushes = [{ id: 'w', title: '출근', color: '#000' }, { id: 'c', title: '수업', color: '#111' }];
let g = paintRect(emptyGrid(), { day: 0, slot: 6 }, { day: 4, slot: 23 }, 'w');
let evs = gridToEvents(g, brushes);
assert.equal(evs.length, 1);
assert.deepEqual(evs[0].days, [0, 1, 2, 3, 4]);
assert.equal(formatTime(evs[0].start), '09:00');
assert.equal(formatTime(evs[0].end), '18:00');
// 수요일만 일찍 끝나게 지우면 수요일은 따로 묶임
g = paintRect(g, { day: 2, slot: 20 }, { day: 2, slot: 23 }, null);
evs = gridToEvents(g, brushes);
assert.equal(evs.length, 2);
assert.ok(evs.some((e) => e.days.join() === '2' && formatTime(e.end) === '16:00'));
// 다른 붓(수업)을 토요일에
g = paintRect(g, { day: 5, slot: 8 }, { day: 5, slot: 11 }, 'c');
evs = gridToEvents(g, brushes);
assert.ok(evs.some((e) => e.title === '수업' && e.days.join() === '5' && formatTime(e.start) === '10:00'));
// 되돌리기: 일정 → 격자 → 일정이 같은 결과
const round = eventsToGrid(evs, ['#a', '#b']);
const again = gridToEvents(round.grid, round.brushes);
assert.deepEqual(
  again.map((e) => [e.title, e.days.join(), e.start, e.end]),
  evs.map((e) => [e.title, e.days.join(), e.start, e.end]),
);

// 운동별 시간: 러닝 30분 → 헬스 60분이 연달아
w = buildWeek(
  { ...base, exercise: { ...base.exercise, items: [{ type: '러닝', minutes: 30 }, { type: '헬스', minutes: 60 }] } },
  [],
  0,
);
const exs = w.days[1].filter((b) => b.kind === 'exercise');
assert.deepEqual(exs.map((b) => `${b.title} ${formatTime(b.start)}-${formatTime(b.end)}`), ['러닝 07:30-08:00', '헬스 08:00-09:00']);

// 격자: 칠한 덩어리 누르면 통째로 삭제
let g2 = paintRect(emptyGrid(), { day: 0, slot: 6 }, { day: 0, slot: 23 }, 'w');
g2 = clearRun(g2, 0, 10);
assert.equal(gridToEvents(g2, brushes).length, 0);

// 식사: 기준 시각(점심 12:00, 저녁 18:30)에 먼저 넣음
w = buildWeek(base, [], 0);
const meals = (d: number) => w.days[d].filter((b) => b.kind === 'meal').map((b) => `${b.title} ${formatTime(b.start)}`);
assert.deepEqual(meals(0), ['점심 12:00', '저녁 18:30']);
assert.deepEqual(meals(6), ['점심 12:00', '저녁 18:30']);
// 근무 09~18이면 점심은 근무 위에 12:00으로 겹쳐 넣고, 저녁은 퇴근 뒤
w = buildWeek({ ...base, fixed: [{ id: 'w', title: '출근', days: [0, 1, 2, 3, 4], start: t('09:00'), end: t('18:00') }] }, [], 0);
assert.deepEqual(meals(1), ['점심 12:00', '저녁 18:30']);
// 할 일은 식사 시간을 피함
w = buildWeek({ ...base, fixed: [{ id: 'w', title: '출근', days: [0, 1, 2, 3, 4], start: t('09:00'), end: t('18:00') }] }, [{ id: 'z', title: '공부', minutes: 60, day: 0, done: false }], 0);
const study = w.days[0].find((b) => b.kind === 'task')!;
assert.equal(formatTime(study.start), '19:30'); // 저녁 18:30~19:30 뒤

console.log('시간표 규칙 테스트 모두 통과');
