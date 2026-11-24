// 고정 일정 입력: 주간 격자에 손가락으로 칠하기
// - 위에서 이름(붓)을 고르고, 격자에서 위아래로 끌면 처음 닿은 요일 칸만 칠해집니다.
// - 칠한 덩어리를 한 번 누르면 그 덩어리가 통째로 지워집니다.
import { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Brush,
  clearRun,
  eventsToGrid,
  Grid,
  gridToEvents,
  paintRect,
  SLOT_COUNT,
  slotStart,
} from '../fixedGrid';
import { colors } from '../theme';
import { DAY_LABELS, FixedEvent } from '../types';
import { formatTime } from '../time';
import { Input } from '../ui';

const PALETTE = ['#7C9CFF', '#FFB454', '#C38AFF', '#4CC3C3', '#FF7A8A', '#A0D468'];
const PRESETS = ['출근', '수업', '알바', '통근'];
const ROW_H = 13;
const AXIS_W = 30;
const HEADER_H = 22;

interface Cell {
  day: number;
  slot: number;
}

export default function FixedGrid({
  initial,
  onChange,
  onTouching,
}: {
  initial: FixedEvent[];
  onChange: (events: FixedEvent[]) => void;
  onTouching?: (touching: boolean) => void;
}) {
  const start = useMemo(() => eventsToGrid(initial, PALETTE), []); // 처음 한 번만
  const [grid, setGrid] = useState<Grid>(start.grid);
  const [brushes, setBrushes] = useState<Brush[]>(start.brushes);
  const [active, setActive] = useState<string | null>(start.brushes[0]?.id ?? null);
  const [width, setWidth] = useState(0);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  // 드래그 중 상태 (렌더에 안 쓰는 값은 ref로)
  const drag = useRef<{ from: Cell; base: Grid; moved: boolean } | null>(null);
  const [preview, setPreview] = useState<Grid | null>(null);

  const colW = width > 0 ? (width - AXIS_W) / 7 : 0;
  const shown = preview ?? grid;

  function cellAt(e: GestureResponderEvent): Cell {
    const { locationX, locationY } = e.nativeEvent;
    const day = Math.min(6, Math.max(0, Math.floor((locationX - AXIS_W) / colW)));
    const slot = Math.min(SLOT_COUNT - 1, Math.max(0, Math.floor((locationY - HEADER_H) / ROW_H)));
    return { day, slot };
  }

  function commit(next: Grid, list = brushes) {
    setGrid(next);
    onChange(gridToEvents(next, list));
  }

  function addBrush(title: string) {
    const t = title.trim();
    if (!t) return;
    const found = brushes.find((b) => b.title === t);
    if (found) return setActive(found.id);
    const b: Brush = { id: `b${Date.now()}`, title: t, color: PALETTE[brushes.length % PALETTE.length] };
    setBrushes([...brushes, b]);
    setActive(b.id);
    setNaming(false);
    setNewName('');
  }

  function removeBrush(id: string) {
    const next = grid.map((col) => col.map((v) => (v === id ? null : v)));
    const list = brushes.filter((b) => b.id !== id);
    setBrushes(list);
    if (active === id) setActive(list[0]?.id ?? null);
    commit(next, list);
  }

  const touchable = !!active && colW > 0;

  return (
    <View>
      {/* 붓(이름) 고르기 */}
      <View style={st.brushRow}>
        {brushes.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => setActive(b.id)}
            onLongPress={() => removeBrush(b.id)}
            style={[st.brush, active === b.id && { borderColor: b.color, backgroundColor: b.color + '33' }]}
          >
            <View style={[st.swatch, { backgroundColor: b.color }]} />
            <Text style={st.brushText}>{b.title}</Text>
          </Pressable>
        ))}
        {!naming && (
          <Pressable onPress={() => setNaming(true)} style={st.brush}>
            <Text style={[st.brushText, { color: colors.accent }]}>+ 이름</Text>
          </Pressable>
        )}
      </View>
      {naming && (
        <View style={st.nameRow}>
          <Input
            autoFocus
            placeholder="예: 출근"
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={() => addBrush(newName)}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Pressable onPress={() => addBrush(newName)} style={st.addBtn}>
            <Text style={st.addBtnText}>추가</Text>
          </Pressable>
        </View>
      )}
      {brushes.length === 0 && !naming && (
        <View style={st.brushRow}>
          {PRESETS.map((p) => (
            <Pressable key={p} onPress={() => addBrush(p)} style={[st.brush, st.preset]}>
              <Text style={st.brushText}>{p}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={st.help}>
        {active
          ? '요일 칸을 위아래로 끌어 칠해요. 칠한 덩어리를 한 번 누르면 지워져요.'
          : '먼저 위에서 이름을 고르거나 만들어 주세요.'}
      </Text>

      {/* 격자 */}
      <View
        style={[st.grid, { height: HEADER_H + SLOT_COUNT * ROW_H }]}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => touchable}
        onMoveShouldSetResponder={() => touchable}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onTouching?.(true);
          const from = cellAt(e);
          drag.current = { from, base: grid, moved: false };
          // 빈 칸에서 시작하면 바로 한 칸 칠해 보여 줌. 칠한 칸이면 손을 떼기 전까지 기다림(누르기=삭제)
          if (!grid[from.day][from.slot]) setPreview(paintRect(grid, from, from, active));
        }}
        onResponderMove={(e) => {
          const d = drag.current;
          if (!d) return;
          // 처음 닿은 요일에서만 위아래로
          const to = { day: d.from.day, slot: cellAt(e).slot };
          if (to.slot !== d.from.slot) d.moved = true;
          if (d.moved) setPreview(paintRect(d.base, d.from, to, active));
        }}
        onResponderRelease={() => {
          const d = drag.current;
          if (d && !d.moved && d.base[d.from.day][d.from.slot]) {
            commit(clearRun(d.base, d.from.day, d.from.slot)); // 칠한 덩어리 누르기 → 삭제
          } else if (preview) {
            commit(preview);
          }
          drag.current = null;
          setPreview(null);
          onTouching?.(false);
        }}
        onResponderTerminate={() => {
          drag.current = null;
          setPreview(null);
          onTouching?.(false);
        }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* 요일 머리글 */}
          {DAY_LABELS.map((l, d) => (
            <Text key={l} style={[st.dayLabel, { left: AXIS_W + d * colW, width: colW }]}>
              {l}
            </Text>
          ))}
          {/* 시간 눈금: 1시간마다 선, 2시간마다 숫자 */}
          {Array.from({ length: SLOT_COUNT / 2 + 1 }, (_, h) => (
            <View key={h} style={[st.hourLine, { top: HEADER_H + h * 2 * ROW_H, left: AXIS_W }]} />
          ))}
          {Array.from({ length: SLOT_COUNT / 4 + 1 }, (_, i) => (
            <Text key={i} style={[st.hourLabel, { top: HEADER_H + i * 4 * ROW_H - 6 }]}>
              {slotStart(i * 4) / 60}
            </Text>
          ))}
          {/* 요일 구분선 */}
          {Array.from({ length: 8 }, (_, d) => (
            <View key={d} style={[st.dayLine, { left: AXIS_W + d * colW, top: HEADER_H }]} />
          ))}
          {/* 칠한 덩어리 */}
          {colW > 0 &&
            shown.map((col, d) => {
              const runs: { s: number; e: number; id: string }[] = [];
              let s = 0;
              while (s < SLOT_COUNT) {
                const id = col[s];
                if (!id) {
                  s++;
                  continue;
                }
                let e = s;
                while (e < SLOT_COUNT && col[e] === id) e++;
                runs.push({ s, e, id });
                s = e;
              }
              return runs.map((r) => {
                const b = brushes.find((x) => x.id === r.id);
                return (
                  <View
                    key={`${d}-${r.s}`}
                    style={[
                      st.block,
                      {
                        left: AXIS_W + d * colW + 1.5,
                        width: colW - 3,
                        top: HEADER_H + r.s * ROW_H + 1,
                        height: (r.e - r.s) * ROW_H - 2,
                        backgroundColor: b?.color ?? colors.accent,
                      },
                    ]}
                  >
                    {r.e - r.s >= 2 && (
                      <Text style={st.blockText} numberOfLines={2}>
                        {b?.title}
                      </Text>
                    )}
                  </View>
                );
              });
            })}
        </View>
      </View>

      {/* 결과 요약 */}
      <Summary grid={grid} brushes={brushes} />
    </View>
  );
}

function Summary({ grid, brushes }: { grid: Grid; brushes: Brush[] }) {
  const events = gridToEvents(grid, brushes);
  if (events.length === 0) return <Text style={st.help}>아직 칠한 일정이 없어요. 없으면 그냥 넘어가도 돼요.</Text>;
  return (
    <View style={{ marginTop: 10 }}>
      {events.map((e) => (
        <Text key={e.id} style={st.summary}>
          · {e.title} {e.days.map((d) => DAY_LABELS[d]).join('')} {formatTime(e.start)}~{formatTime(e.end)}
        </Text>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  brushRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  brush: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  preset: { borderStyle: 'dashed' },
  swatch: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  brushText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addBtn: { marginLeft: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.accent, borderRadius: 10 },
  addBtnText: { color: colors.bg, fontWeight: '700' },
  help: { color: colors.sub, fontSize: 13, marginVertical: 6, lineHeight: 18 },
  // userSelect: 웹 미리보기에서 드래그가 글자 선택으로 바뀌어 끊기는 것 방지
  grid: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', marginTop: 4, userSelect: 'none' },
  dayLabel: { position: 'absolute', top: 3, textAlign: 'center', color: colors.sub, fontSize: 12, fontWeight: '600' },
  hourLine: { position: 'absolute', right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  hourLabel: { position: 'absolute', left: 0, width: AXIS_W - 6, textAlign: 'right', color: colors.sub, fontSize: 10 },
  dayLine: { position: 'absolute', bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  block: { position: 'absolute', borderRadius: 4, paddingHorizontal: 2, paddingTop: 1, opacity: 0.9 },
  blockText: { color: '#0F1115', fontSize: 9, fontWeight: '700' },
  summary: { color: colors.text, fontSize: 14, marginBottom: 3 },
});
