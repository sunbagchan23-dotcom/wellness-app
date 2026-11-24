// 한 주 시간표 (기상~취침 범위). 오늘 열은 강조하고 지금 시각에 선을 긋습니다.
// 블록을 누르면 완료 체크, 할 일 블록은 길게 누르면 삭제.
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, kindColors } from '../theme';
import { Block, DAY_LABELS, DayIndex, WeekSchedule } from '../types';
import { formatTime } from '../time';

const HOUR_H = 36;
const AXIS_W = 28;
const HEADER_H = 26;

export default function WeekTimetable({
  week,
  today,
  now,
  wake,
  bedtime,
  isDone,
  onToggle,
  onDeleteTask,
}: {
  week: WeekSchedule;
  today: DayIndex;
  now: number;
  wake: number;
  bedtime: number;
  isDone: (day: DayIndex, block: Block) => boolean;
  onToggle: (day: DayIndex, block: Block) => void;
  onDeleteTask: (blockId: string) => void;
}) {
  const [width, setWidth] = useState(0);
  // 표시 범위: 기상 시각이 속한 정시 ~ 취침 시각을 올림한 정시
  const from = Math.floor(wake / 60) * 60;
  const to = bedtime > wake ? Math.min(1440, Math.ceil(bedtime / 60) * 60) : 1440;
  const hours = (to - from) / 60;
  const colW = width > 0 ? (width - AXIS_W) / 7 : 0;
  const y = (min: number) => HEADER_H + ((min - from) / 60) * HOUR_H;

  return (
    <View
      style={[st.wrap, { height: HEADER_H + hours * HOUR_H + 4 }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {colW > 0 && (
        <>
          {/* 오늘 열 배경 */}
          <View pointerEvents="none" style={[st.todayCol, { left: AXIS_W + today * colW, width: colW }]} />
          {/* 요일 머리글 */}
          {DAY_LABELS.map((l, d) => (
            <Text
              key={l}
              style={[st.dayLabel, { left: AXIS_W + d * colW, width: colW }, d === today && st.dayLabelToday]}
            >
              {d === today ? `${l} 오늘` : l}
            </Text>
          ))}
          {/* 시간 눈금 */}
          {Array.from({ length: hours + 1 }, (_, i) => (
            <View key={i} pointerEvents="none">
              <View style={[st.hourLine, { top: y(from + i * 60), left: AXIS_W }]} />
              {i < hours && (
                <Text style={[st.hourLabel, { top: y(from + i * 60) - 6 }]}>{((from / 60 + i) % 24).toString()}</Text>
              )}
            </View>
          ))}
          {/* 블록 */}
          {week.days.map((blocks, d) =>
            blocks
              .filter((b) => b.kind !== 'sleep' && b.end > from && b.start < to)
              .map((b) => {
                const done = isDone(d as DayIndex, b);
                const top = y(Math.max(b.start, from));
                const height = Math.max(14, y(Math.min(b.end, to)) - top - 2);
                return (
                  <Pressable
                    key={`${d}-${b.id}`}
                    onPress={() => onToggle(d as DayIndex, b)}
                    onLongPress={() => b.kind === 'task' && onDeleteTask(b.id)}
                    style={[
                      st.block,
                      {
                        left: AXIS_W + d * colW + 1.5,
                        width: colW - 3,
                        top: top + 1,
                        height,
                        backgroundColor: kindColors[b.kind],
                      },
                      done && st.blockDone,
                    ]}
                  >
                    <Text style={st.blockText} numberOfLines={height > 30 ? 3 : 1}>
                      {done ? '✓ ' : ''}
                      {b.title}
                    </Text>
                    {height > 44 && <Text style={st.blockTime}>{formatTime(b.start)}</Text>}
                  </Pressable>
                );
              }),
          )}
          {/* 지금 선 */}
          {now >= from && now < to && (
            <View pointerEvents="none" style={[st.nowLine, { top: y(now), left: AXIS_W + today * colW, width: colW }]} />
          )}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  todayCol: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#232A44' },
  dayLabel: { position: 'absolute', top: 5, textAlign: 'center', color: colors.sub, fontSize: 12, fontWeight: '600' },
  dayLabelToday: { color: colors.accent, fontWeight: '800' },
  hourLine: { position: 'absolute', right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  hourLabel: { position: 'absolute', left: 0, width: AXIS_W - 5, textAlign: 'right', color: colors.sub, fontSize: 10 },
  block: { position: 'absolute', borderRadius: 5, paddingHorizontal: 3, paddingTop: 2, overflow: 'hidden' },
  blockDone: { opacity: 0.35 },
  blockText: { color: '#0F1115', fontSize: 10, fontWeight: '800' },
  blockTime: { color: '#0F1115', fontSize: 9, marginTop: 1, opacity: 0.8 },
  nowLine: { position: 'absolute', height: 2, backgroundColor: '#FF5A5F' },
});
