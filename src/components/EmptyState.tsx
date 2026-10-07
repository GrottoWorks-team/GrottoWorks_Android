// EmptyState — khối rỗng dùng chung.
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/tokens';

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.box}>
      <AppText variant="sub" style={styles.text}>
        {text}
      </AppText>
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
  },
  text: { textAlign: 'center' },
});
