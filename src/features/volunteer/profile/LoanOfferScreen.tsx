// Đăng ký cho mượn dụng cụ/vật tư (kể cả nhập hộ người cho mượn không có tài
// khoản) — BE: POST /api/v1/loan-offers (role VOLUNTEER).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { useAreas, useOfferLoan } from '../../../api/hooks';
import { colors, radius, spacing } from '../../../theme/tokens';

export function LoanOfferScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigation = useNavigation();
  const { data: areas = [] } = useAreas();
  const offer = useOfferLoan();

  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [returnDate, setReturnDate] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [areaId, setAreaId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const qty = Number(quantity.replace(',', '.'));
    if (!ownerName.trim() || !itemName.trim() || !returnDate.trim()) {
      return setError(t('common.required'));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate.trim())) {
      return setError(t('loan.dateFormat'));
    }
    if (!Number.isFinite(qty) || qty <= 0) return setError(t('pledge.qtyInvalid'));

    try {
      await offer.mutateAsync({
        ownerName: ownerName.trim(),
        itemName: itemName.trim(),
        quantity: qty,
        expectedReturnDate: new Date(`${returnDate.trim()}T00:00:00`).toISOString(),
        ...(ownerPhone.trim() ? { ownerPhone: ownerPhone.trim() } : {}),
        ...(ownerAddress.trim() ? { ownerAddress: ownerAddress.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(condition.trim() ? { initialCondition: condition.trim() } : {}),
        ...(areaId ? { workAreaId: areaId } : {}),
      });
      toast(t('loan.success'));
      navigation.goBack();
    } catch {
      setError(t('common.error'));
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('loan.title')} sub={t('loan.sub')} />

        <Card style={styles.card}>
          <Field label={t('loan.itemName')}>
            <TextInput
              value={itemName}
              onChangeText={setItemName}
              placeholder={t('loan.itemNamePlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.quantity')}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.returnDate')}>
            <TextInput
              value={returnDate}
              onChangeText={setReturnDate}
              placeholder="2026-12-20"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.condition')}>
            <TextInput
              value={condition}
              onChangeText={setCondition}
              placeholder={t('loan.conditionPlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.description')}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, styles.textarea]}
            />
          </Field>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('loan.ownerTitle')}</AppText>
          <AppText variant="sub">{t('loan.ownerHint')}</AppText>
          <Field label={t('loan.ownerName')}>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.ownerPhone')}>
            <TextInput
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Field>
          <Field label={t('loan.ownerAddress')}>
            <TextInput
              value={ownerAddress}
              onChangeText={setOwnerAddress}
              style={styles.input}
            />
          </Field>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('loan.area')}</AppText>
          <AppText variant="sub">{t('loan.areaHint')}</AppText>
          <View style={styles.areas}>
            {areas.map((area) => {
              const on = area.id === areaId;
              return (
                <AppText
                  key={area.id}
                  variant="sub"
                  onPress={() => setAreaId(on ? '' : area.id)}
                  style={[styles.areaChip, on ? styles.areaChipOn : null]}
                  color={on ? '#FFFFFF' : colors.ink}
                >
                  {area.name}
                </AppText>
              );
            })}
          </View>
        </Card>

        {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

        <Button label={t('loan.submit')} onPress={submit} loading={offer.isPending} />
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="sub">{label}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  field: { gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.panel,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  areas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  areaChip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.panel,
  },
  areaChipOn: { backgroundColor: colors.pine, borderColor: colors.pine },
  errorText: { color: colors.dangerFg, fontWeight: '600' },
});
