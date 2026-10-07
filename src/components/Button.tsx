// Nút — đồng bộ tone với webapp (primary pine, outline, ghost, danger).
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : colors.pine} />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

// Icon slot bên trái nhãn.
export function ButtonWithIcon({ icon, ...props }: ButtonProps & { icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.disabled || props.loading ? undefined : props.onPress}
      style={({ pressed }) => [
        styles.base,
        props.size === 'sm' ? styles.sm : styles.md,
        variantStyles[props.variant ?? 'primary'],
        styles.row,
        pressed && !props.disabled ? styles.pressed : null,
        props.disabled || props.loading ? styles.disabled : null,
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.iconWrap}>{icon}</View>
      )}
      <Text style={[styles.label, labelStyles[props.variant ?? 'primary']]}>{props.label}</Text>
    </Pressable>
  );
}

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.pine, borderColor: colors.pine },
  outline: { backgroundColor: 'transparent', borderColor: colors.hairline },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg },
};

const labelStyles: Record<Variant, { color: string }> = {
  primary: { color: '#FFFFFF' },
  outline: { color: colors.ink },
  ghost: { color: colors.pine },
  danger: { color: colors.dangerFg },
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row' },
  md: { height: 44, paddingHorizontal: spacing.lg },
  sm: { height: 36, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: '600' },
  iconWrap: { marginRight: spacing.xs },
});
