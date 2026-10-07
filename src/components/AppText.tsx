// Typography theo mobile type scale (mục 4.1). Dùng thay <Text> trực tiếp.
import { Text } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { colors, fontSize } from '../theme/tokens';

type Variant = 'display' | 'h1' | 'h2' | 'body' | 'sub' | 'label' | 'mono';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: fontSize.display, fontWeight: '700', color: colors.ink },
  h1: { fontSize: fontSize.h1, fontWeight: '700', color: colors.ink },
  h2: { fontSize: fontSize.h2, fontWeight: '600', color: colors.ink },
  body: { fontSize: fontSize.body, fontWeight: '400', color: colors.ink },
  sub: { fontSize: fontSize.sub, fontWeight: '400', color: colors.muted },
  label: { fontSize: fontSize.badge, fontWeight: '600', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  mono: { fontSize: fontSize.sub, color: colors.ink, fontVariant: ['tabular-nums'] },
};

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[VARIANTS[variant], color ? { color } : null, style]} />;
}
