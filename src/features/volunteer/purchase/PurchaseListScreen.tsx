// Việc đi mua của tôi (F-RES-09, BR-30) — TNV được trưởng khu giao việc
// `taskType = PURCHASE` ghi lại lần mua thật. Kho KHÔNG tăng ở bước này (BR-26):
// trưởng ban vật tư xác nhận giao hàng thì kho khu mới tăng.
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { EmptyState } from '../../../components/EmptyState';
import { StatusTag } from '../../../components/StatusTag';
import { useMyPurchaseTasks } from '../../../api/hooks';
import { colors, spacing } from '../../../theme/tokens';
import type { ProfileStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

export function PurchaseListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { data: tasks = [], isPending, refetch, isRefetching } = useMyPurchaseTasks();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('purchase.title')} sub={t('purchase.sub')} />

        <View style={styles.refreshRow}>
          <Button
            label={isRefetching ? t('common.loading') : t('purchase.refresh')}
            variant="outline"
            onPress={() => void refetch()}
          />
        </View>

        {isPending ? (
          <AppText variant="sub">{t('common.loading')}</AppText>
        ) : tasks.length === 0 ? (
          <EmptyState text={t('purchase.empty')} />
        ) : (
          tasks.map((task) => (
            <Card key={task.id} style={styles.card}>
              <View style={styles.row}>
                <AppText variant="h2" style={styles.title}>
                  {task.name}
                </AppText>
                <StatusTag status={task.status} />
              </View>
              <AppText variant="sub">
                {t('purchase.requestRef', { id: task.purchaseRequestId.slice(0, 8) })}
                {task.deadline
                  ? ` · ${t('purchase.deadline', { date: task.deadline.slice(0, 10) })}`
                  : ''}
              </AppText>
              <Button
                label={t('purchase.record')}
                onPress={() =>
                  navigation.navigate('RecordPurchase', {
                    requestId: task.purchaseRequestId,
                    taskName: task.name,
                  })
                }
                style={styles.action}
              />
            </Card>
          ))
        )}

        <AppText variant="sub" style={styles.hint}>
          {t('purchase.stockHint')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  refreshRow: { alignItems: 'flex-start', marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flexShrink: 1 },
  action: { marginTop: spacing.md },
  hint: { color: colors.faint, marginTop: spacing.sm },
});
