// 여러 화면에서 같이 쓰는 작은 부품들
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from './theme';

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <Text style={s.sub}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        kind === 'ghost' && s.ghost,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.buttonText, kind === 'ghost' && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.sub} {...props} style={[s.input, props.style]} />;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  sub: { color: colors.sub, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
