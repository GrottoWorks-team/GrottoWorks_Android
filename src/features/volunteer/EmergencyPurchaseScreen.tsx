// Mua khẩn cấp khi đang làm nhiệm vụ.
// Quy tắc 12/11/2026: TNV KHÔNG còn "việc đi mua" — thiếu vật tư số lượng lớn thì
// MO gửi yêu cầu bổ sung cho Ban phụ trách. Chỉ khi đang thực hiện nhiệm vụ mà thiếu
// vật tư khẩn cấp, TNV mới tự mua: bắt buộc có hoá đơn và tổng tiền < 500.000đ.
// BE: POST /api/v1/tasks/{taskId}/emergency-purchases (role VOLUNTEER).
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PhotoPicker } from '../../components/PhotoPicker';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  ApiError,
  EMERGENCY_PURCHASE_LIMIT,
  uploadEmergencyReceipt,
} from '../../api';
import { useRecordEmergencyPurchase, useTask, useTaskMaterials } from '../../api/hooks';
import { formatVnd } from '../../lib/format';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type Route = RouteProp<TasksStackParamList, 'EmergencyPurchase'>;
type Nav = NativeStackNavigationProp<TasksStackParamList, 'EmergencyPurchase'>;

interface LineDraft {
  materialId: string;
  quantity: string;
  unitPrice: string;
}

const MAX_INVOICES = 5;

export function EmergencyPurchaseScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();

  const { data: task } = useTask(params.taskId);
  const { data: materials = [] } = useTaskMaterials();
  const record = useRecordEmergencyPurchase(params.taskId);

  // Vật tư hiện có của nhiệm vụ (nếu task không khai báo thì cho chọn toàn bộ danh mục).
  const availableMaterials = useMemo(() => {
    const ids = task?.materialIds ?? [];
    if (ids.length === 0) return materials;
    const scoped = materials.filter((m) => ids.includes(m.id));
    return scoped.length > 0 ? scoped : materials;
  }, [materials, task?.materialIds]);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [invoices, setInvoices] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLine = (materialId: string) => {
    setLines((prev) =>
      prev.some((row) => row.materialId === materialId)
        ? prev
        : [
            ...prev,
            {
              materialId,
              quantity: '1',
              unitPrice: String(
                Math.round(
                  materials.find((m) => m.id === materialId)?.estUnitPrice ?? 0,
                ),
              ),
            },
          ],
    );
  };

  const patchLine = (materialId: string, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((row) => (row.materialId === materialId ? { ...row, ...patch } : row)),
    );
  };

  const removeLine = (materialId: string) => {
    setLines((prev) => prev.filter((row) => row.materialId !== materialId));
  };

  const total = lines.reduce((sum, row) => {
    const qty = Number(row.quantity.replace(',', '.'));
    const price = Number(row.unitPrice.replace(/[.,\s]/g, ''));
    return sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
  }, 0);

  const overLimit = total >= EMERGENCY_PURCHASE_LIMIT;

  const submit = async () => {
    setError(null);
    if (lines.length === 0) return setError(t('emergency.lineRequired'));
    if (overLimit) return setError(t('emergency.limitExceeded'));
    if (invoices.length === 0) return setError(t('emergency.invoiceRequired'));

    const items = lines.map((row) => ({
      materialId: row.materialId,
      quantity: Number(row.quantity.replace(',', '.')),
      unitPrice: Number(row.unitPrice.replace(/[.,\s]/g, '')),
    }));
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      return setError(t('emergency.quantityInvalid'));
    }
    if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
      return setError(t('emergency.priceInvalid'));
    }

    try {
      const receiptFileIds: string[] = [];
      for (const uri of invoices) {
        receiptFileIds.push(await uploadEmergencyReceipt(uri));
      }
      await record.mutateAsync({
        taskId: params.taskId,
        buyerName: user?.name ?? '',
        ...(supplierName.trim() ? { supplierName: supplierName.trim() } : {}),
        items,
        receiptFileIds,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast(t('emergency.success'));
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMERGENCY_PURCHASE_LIMIT') return setError(t('emergency.limitExceeded'));
        if (err.code === 'EMERGENCY_PURCHASE_NOT_ASSIGNEE') {
          return setError(t('emergency.notAssignee'));
        }
        if (err.code === 'TASK_INVALID_STATE') return setError(t('emergency.taskNotRunning'));
        return setError(err.message || t('common.error'));
      }
      setError(t('common.error'));
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t('emergency.title')} sub={params.taskTitle ?? t('emergency.sub')} />

        <Card style={styles.card}>
          <AppText variant="sub">{t('emergency.rule')}</AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('emergency.materials')}</AppText>
          {availableMaterials.length === 0 ? (
            <AppText variant="sub">{t('emergency.noMaterials')}</AppText>
          ) : (
            <View style={styles.chips}>
              {availableMaterials.map((material) => {
                const picked = lines.some((row) => row.materialId === material.id);
                return (
                  <Pressable
                    key={material.id}
                    accessibilityRole="button"
                    onPress={() => (picked ? removeLine(material.id) : addLine(material.id))}
                    style={[styles.tag, picked ? styles.tagActive : null]}
                  >
                    <AppText variant="sub" style={picked ? styles.tagTextActive : undefined}>
                      {material.name} ({material.unit})
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {lines.map((row) => {
            const material = materials.find((m) => m.id === row.materialId);
            return (
              <View key={row.materialId} style={styles.line}>
                <View style={styles.lineHead}>
                  <AppText variant="h2" style={styles.lineName}>
                    {material?.name ?? row.materialId}
                  </AppText>
                  <Pressable onPress={() => removeLine(row.materialId)}>
                    <AppText variant="sub" style={styles.remove}>
                      {t('common.remove')}
                    </AppText>
                  </Pressable>
                </View>
                <View style={styles.inputs}>
                  <View style={styles.inputWrap}>
                    <AppText variant="sub">{t('emergency.quantity')}</AppText>
                    <TextInput
                      value={row.quantity}
                      onChangeText={(value) => patchLine(row.materialId, { quantity: value })}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="1"
                      placeholderTextColor={colors.faint}
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <AppText variant="sub">{t('emergency.unitPrice')}</AppText>
                    <TextInput
                      value={row.unitPrice}
                      onChangeText={(value) => patchLine(row.materialId, { unitPrice: value })}
                      keyboardType="number-pad"
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={colors.faint}
                    />
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <AppText variant="label">{t('emergency.total')}</AppText>
            <AppText variant="h1" style={overLimit ? styles.totalOver : undefined}>
              {formatVnd(total)}
            </AppText>
          </View>
          <AppText variant="sub">
            {t('emergency.limit', { amount: formatVnd(EMERGENCY_PURCHASE_LIMIT) })}
          </AppText>
          {overLimit ? (
            <AppText variant="sub" style={styles.overLimitText}>
              {t('emergency.limitExceeded')}
            </AppText>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('emergency.supplier')}</AppText>
          <TextInput
            value={supplierName}
            onChangeText={setSupplierName}
            style={styles.input}
            placeholder={t('emergency.supplierPlaceholder')}
            placeholderTextColor={colors.faint}
          />
          <AppText variant="label" style={styles.blockLabel}>
            {t('emergency.note')}
          </AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={[styles.input, styles.textarea]}
            placeholder={t('emergency.notePlaceholder')}
            placeholderTextColor={colors.faint}
            multiline
          />
          <AppText variant="label" style={styles.blockLabel}>
            {t('emergency.invoice')}
          </AppText>
          <PhotoPicker
            photos={invoices}
            onChange={setInvoices}
            label={t('emergency.invoice')}
            hint={t('emergency.invoiceHint')}
            max={MAX_INVOICES}
          />
        </Card>

        {error ? <AppText variant="sub" style={styles.error}>{error}</AppText> : null}

        <Button
          label={t('emergency.submit')}
          onPress={submit}
          loading={record.isPending}
          disabled={overLimit || lines.length === 0 || invoices.length === 0}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['4xl'] },
  card: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.panel,
  },
  tagActive: { backgroundColor: colors.pine, borderColor: colors.pine },
  tagTextActive: { color: colors.panel },
  line: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineName: { flexShrink: 1 },
  remove: { color: colors.dangerFg },
  inputs: { flexDirection: 'row', gap: spacing.sm },
  inputWrap: { flex: 1, gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  blockLabel: { marginTop: spacing.sm },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
  },
  totalOver: { color: colors.dangerFg },
  overLimitText: { color: colors.dangerFg },
  error: { color: colors.dangerFg },
});
