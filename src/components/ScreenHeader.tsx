// ScreenHeader — tiêu đề màn hình căn giữa, nổi bật (cỡ display, đậm, màu ink),
// kèm phụ đề tuỳ chọn. Dùng chung cho các tab để header đồng nhất.
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme/tokens';

export function ScreenHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="display" style={styles.title}>
        {title}
      </AppText>
      {sub ? (
        <AppText variant="sub" style={styles.sub}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  title: { textAlign: 'center' },
  sub: { textAlign: 'center' },
});
