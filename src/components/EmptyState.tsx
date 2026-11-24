// EmptyState — khối rỗng dùng chung: lý do + (tuỳ chọn) nút thử lại/hành động.
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme/tokens';

export function EmptyState({
  text,
  hint,
  actionLabel,
  onAction,
  loading,
}: {
  text: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.box}>
      <AppText variant="sub" style={styles.text}>
        {text}
      </AppText>
      {hint ? (
        <AppText variant="sub" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="outline"
          size="sm"
          onPress={onAction}
          loading={loading}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairline,
    borderRadius: radius.card,
    padding: spacing['2xl'],
    alignItems: 'center',
    backgroundColor: colors.panel,
    gap: spacing.xs,
  },
  text: { textAlign: 'center' },
  hint: { textAlign: 'center', color: colors.faint },
  action: { marginTop: spacing.sm },
});
