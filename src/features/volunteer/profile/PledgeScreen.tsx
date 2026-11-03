// Cam kết quyên góp (pledge): vật tư theo nhu cầu còn thiếu của mùa, hoặc tiền.
// BE: POST /material-pledges | POST /monetary-pledges (role VOLUNTEER).
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { EmptyState } from '../../../components/EmptyState';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../auth/AuthContext';
import { ApiError } from '../../../api';
import { useContributionNeeds, usePledgeMaterial, usePledgeMoney } from '../../../api/hooks';
import { colors, radius, spacing } from '../../../theme/tokens';

type Mode = 'material' | 'money';

export function PledgeScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigation = useNavigation();
  const { user } = useAuth();
  const volunteerId = user?.id ?? '';

  const [mode, setMode] = useState<Mode>('material');
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: needs = [], isPending } = useContributionNeeds();
  const pledgeMaterial = usePledgeMaterial(volunteerId);
  const pledgeMoney = usePledgeMoney(volunteerId);

  const need = needs.find((n) => n.materialId === selectedNeedId);

  const submit = async () => {
    setError(null);
    try {
      if (mode === 'material') {
        if (!need) return setError(t('pledge.pickNeed'));
        const qty = Number(quantity.replace(',', '.'));
        if (!Number.isFinite(qty) || qty <= 0) return setError(t('pledge.qtyInvalid'));
        await pledgeMaterial.mutateAsync({
          workAreaId: need.workAreaId,
          items: [{ materialId: need.materialId, pledgedQuantity: qty }],
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      } else {
        const value = Number(amount.replace(/[.,\s]/g, ''));
        if (!Number.isFinite(value) || value <= 0) return setError(t('pledge.qtyInvalid'));
        await pledgeMoney.mutateAsync({
          amount: value,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }
      toast(t('pledge.success'));
      navigation.goBack();
    } catch (err) {
      // 404 = gateway chưa mở route pledge (BE phải bổ sung YARP route).
      setError(
        err instanceof ApiError && err.status === 404
          ? t('pledge.endpointUnavailable')
          : t('common.error'),
      );
    }
  };

  const pending = pledgeMaterial.isPending || pledgeMoney.isPending;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('pledge.title')} sub={t('pledge.sub')} />

        <View style={styles.tabs}>
          <TabButton
            label={t('pledge.materialTab')}
            active={mode === 'material'}
            onPress={() => setMode('material')}
          />
          <TabButton
            label={t('pledge.moneyTab')}
            active={mode === 'money'}
            onPress={() => setMode('money')}
          />
        </View>

        {mode === 'material' ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('pledge.needTitle')}</AppText>
            <AppText variant="sub">{t('pledge.needHint')}</AppText>
            {isPending ? (
              <AppText variant="sub">{t('common.loading')}</AppText>
            ) : needs.length === 0 ? (
              <EmptyState text={t('pledge.noNeeds')} />
            ) : (
              needs.map((n) => {
                const on = n.materialId === selectedNeedId;
                return (
                  <Pressable
                    key={`${n.workAreaId}-${n.materialId}`}
                    onPress={() => {
                      setSelectedNeedId(n.materialId);
                      setQuantity(String(n.remainingNeed));
                      setError(null);
                    }}
                    style={[styles.needRow, on ? styles.needRowOn : null]}
                  >
                    <AppText variant="h2">
                      {n.materialName} · {n.workAreaName}
                    </AppText>
                    <AppText variant="sub">
                      {t('pledge.needRemaining', { qty: n.remainingNeed, unit: n.unit })}
                    </AppText>
                  </Pressable>
                );
              })
            )}

            <AppText variant="label">{t('pledge.qty')}</AppText>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
            {need ? (
              <AppText variant="sub">
                {t('pledge.unitOf', { unit: need.unit, area: need.workAreaName })}
              </AppText>
            ) : null}
          </Card>
        ) : (
          <Card style={styles.card}>
            <AppText variant="label">{t('pledge.amount')}</AppText>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="500000"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
            <AppText variant="sub">{t('pledge.amountHint')}</AppText>
          </Card>
        )}

        <Card style={styles.card}>
          <AppText variant="label">{t('pledge.note')}</AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t('pledge.notePlaceholder')}
            placeholderTextColor={colors.faint}
            style={[styles.input, styles.textarea]}
          />
        </Card>

        {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

        <Button label={t('pledge.submit')} onPress={submit} loading={pending} />
      </ScrollView>
    </Screen>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active ? styles.tabOn : null]}>
      <AppText variant="sub" color={active ? '#FFFFFF' : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
  },
  tabOn: { backgroundColor: colors.pine, borderColor: colors.pine },
  card: { gap: spacing.sm },
  needRow: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 2,
    marginTop: spacing.xs,
  },
  needRowOn: { borderColor: colors.pine, backgroundColor: colors.canvas },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.panel,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: colors.dangerFg, fontWeight: '600' },
});
