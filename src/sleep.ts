// 수면 사이클 계산 (sleepytime.cc와 같은 방식)
//
// 가정: 잠드는 데 15분, 한 사이클 90분.
// 근거 수준: 평균 사이클 길이는 90~100분 정도로 측정되지만 사람마다, 같은 밤 안에서도
// 70~150분까지 달라서, "딱 사이클 끝에 깨운다"는 정확한 보장이 아니라 대략적인 안내입니다.
// 그래서 사이클 수와 함께 총 수면 시간(성인 권장 7시간 이상)을 같이 보여 줍니다.

export const FALL_ASLEEP_MIN = 15;
export const CYCLE_MIN = 90;

export interface SleepOption {
  cycles: number;
  wake: number; // 기상 시각(자정 기준 분, 1440 미만으로 정규화)
  sleepHours: number; // 실제 잠든 시간
  inBedHours: number; // 누워 있는 시간(잠드는 15분 포함) → 시간표에서 막는 시간
  level: 'short' | 'ok' | 'good';
}

export function sleepOptions(bedtime: number): SleepOption[] {
  return [3, 4, 5, 6].map((cycles) => {
    const asleep = cycles * CYCLE_MIN;
    const inBed = asleep + FALL_ASLEEP_MIN;
    const sleepHours = asleep / 60;
    return {
      cycles,
      wake: (bedtime + inBed) % 1440,
      sleepHours,
      inBedHours: inBed / 60,
      // 성인 권장 7시간 이상(AASM/SRS 2015) 기준
      level: sleepHours >= 7 ? 'good' : sleepHours >= 6 ? 'ok' : 'short',
    };
  });
}
