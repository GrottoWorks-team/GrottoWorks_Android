// Việc đi mua của tôi (F-RES-09, BR-30) — TNV được trưởng khu giao việc `taskType = PURCHASE`
// theo dõi tiến độ; trưởng ban vật tư (MO) là người ghi nhận lần mua thật (đổi 26/11/2026).
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { StatusTag } from '../../../components/StatusTag';
import { useMyPurchaseTasks } from '../../../api/hooks';
import { colors, spacing } from '../../../theme/tokens';

export function PurchaseListScreen() {
  const { t } = useTranslation();
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
              <AppText variant="sub" style={styles.hint}>
                {t('purchase.recordedByOfficer')}
              </AppText>
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
