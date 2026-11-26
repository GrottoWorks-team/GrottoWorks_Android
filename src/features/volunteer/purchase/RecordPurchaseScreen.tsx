// Luồng mua đã đổi (26/11/2026): trưởng ban vật tư (MO) ghi nhận lần mua và người mua là user giáo xứ
// được gán vào task PURCHASE, nên app tình nguyện viên chỉ còn hướng dẫn thay vì form ghi nhận.
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { spacing } from '../../../theme/tokens';

export function RecordPurchaseScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('purchase.title')} sub={t('purchase.sub')} />
        <Card>
          <View style={styles.body}>
            <AppText variant="sub">{t('purchase.recordedByOfficer')}</AppText>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  body: { gap: spacing.sm },
});
