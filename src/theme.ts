// 색과 간격을 한곳에 모았습니다. 디자인을 바꾸고 싶으면 여기부터 고치세요.
import { BlockKind } from './types';

export const colors = {
  bg: '#0F1115',
  card: '#1A1D24',
  border: '#2A2E38',
  text: '#F2F3F5',
  sub: '#9AA0AC',
  accent: '#7C9CFF',
  warn: '#FFB454',
  done: '#4CC38A',
};

export const kindColors: Record<BlockKind, string> = {
  sleep: '#5B5F97',
  fixed: '#7C9CFF',
  exercise: '#4CC38A',
  meal: '#F2A7C3',
  task: '#FFB454',
};

export const kindLabels: Record<BlockKind, string> = {
  sleep: '수면',
  fixed: '고정',
  exercise: '운동',
  meal: '식사',
  task: '할 일',
};
