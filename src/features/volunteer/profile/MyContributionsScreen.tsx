// Đóng góp của tôi: danh sách pledge vật tư/tiền đã gửi cho BE
// (GET /api/v1/users/me/contributions), kèm trạng thái nhận hàng.
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { EmptyState } from '../../../components/EmptyState';
import { StatusTag } from '../../../components/StatusTag';
import { useAuth } from '../../../auth/AuthContext';
import { useMyContributions } from '../../../api/hooks';
import { vnd } from '../../../lib/format';
import { colors, spacing } from '../../../theme/tokens';

export function MyContributionsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const volunteerId = user?.id ?? '';
  const { data: contributions = [], isPending } = useMyContributions(volunteerId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('contrib.title')} sub={t('contrib.sub')} />

        {isPending ? (
          <AppText variant="sub">{t('common.loading')}</AppText>
        ) : contributions.length === 0 ? (
          <EmptyState text={t('contrib.empty')} />
        ) : (
          contributions.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.row}>
                <AppText variant="h2">
                  {item.type === 'MONEY' ? t('contrib.typeMoney') : t('contrib.typeMaterial')}
                </AppText>
                <StatusTag status={item.status} />
              </View>
              <AppText variant="sub">{item.donationDate}</AppText>

              {item.pledgedAmount != null ? (
                <AppText variant="body">
                  {t('contrib.pledged', { value: vnd(item.pledgedAmount) })}
                </AppText>
              ) : null}
              {item.receivedAmount != null ? (
                <AppText variant="body">
                  {t('contrib.received', { value: vnd(item.receivedAmount) })}
                </AppText>
              ) : null}

              {item.items.map((line) => (
                <AppText key={line.id} variant="sub">
                  {line.materialName}:{' '}
                  {line.pledgedQuantity != null
                    ? t('contrib.qtyPledged', {
                        qty: line.pledgedQuantity,
                        unit: line.unit,
                      })
                    : ''}{' '}
                  {t('contrib.qtyReceived', { qty: line.receivedQuantity, unit: line.unit })}
                </AppText>
              ))}

              {item.note ? (
                <AppText variant="sub" style={styles.note}>
                  {item.note}
                </AppText>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  note: { color: colors.faint },
});
