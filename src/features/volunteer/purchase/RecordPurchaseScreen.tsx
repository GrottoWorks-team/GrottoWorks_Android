// Ghi nhận lần mua thật (F-RES-09, BR-26/BR-30): số lượng, đơn giá, nhà cung cấp + **ảnh hoá đơn**.
// BE KHÔNG nhập kho ở bước này; kho khu chỉ tăng khi trưởng ban vật tư xác nhận
// giao hàng (`POST /purchases/{id}/confirm-delivery`).
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { EmptyState } from '../../../components/EmptyState';
import { PhotoPicker } from '../../../components/PhotoPicker';
import { useToast } from '../../../components/Toast';
import { ApiError, uploadPurchaseReceipt } from '../../../api';
import { usePurchaseRequest, useRecordPurchase } from '../../../api/hooks';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { ProfileStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
type Route = RouteProp<ProfileStackParamList, 'RecordPurchase'>;

/** Đơn đang ở trạng thái cho phép ghi nhận (BE: APPROVED/BUYER_ASSIGNED → PURCHASED). */
const RECORDABLE = new Set(['APPROVED', 'BUYER_ASSIGNED']);

interface LineState {
  quantity: string;
  unitPrice: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const fmtMoney = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export function RecordPurchaseScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { data: request, isPending } = usePurchaseRequest(params.requestId);
  const record = useRecordPurchase();

  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Nạp số lượng/đơn giá gợi ý đúng MỘT lần khi đơn tải xong: mặc định mua đủ
  // số lượng yêu cầu, đơn giá suy ra từ dự toán để người mua chỉ cần sửa khi lệch.
  // (Đặt state trong lúc render là pattern React khuyến nghị cho derived state —
  // rule `react-hooks/set-state-in-effect` cấm làm việc này trong useEffect.)
  if (request && !seeded) {
    setSeeded(true);
    setLines(
      Object.fromEntries(
        request.items.map((item) => [
          item.id,
          {
            quantity: String(item.requestedQuantity),
            unitPrice: String(
              item.estimatedCost ? Math.round(item.estimatedCost / item.requestedQuantity) : 0,
            ),
          },
        ]),
      ),
    );
  }

  const total = Object.values(lines).reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    0,
  );

  const canRecord = request ? RECORDABLE.has((request.status ?? '').toUpperCase()) : false;

  /** Mã lỗi BE (`code` trong ProblemDetails) — `ApiError.message` chỉ có `detail`. */
  const problemCode = (err: ApiError): string => {
    const body = err.body as { code?: unknown } | undefined;
    return typeof body?.code === 'string' ? body.code : '';
  };

  /** Lỗi upload (mạng/MinIO/loại tệp) nói rõ để TNV biết phải làm gì. */
  const describeError = (err: unknown): string => {
    if (err instanceof ApiError) {
      const code = problemCode(err);
      if (err.status === 403 && code !== 'FILE_ACCESS_DENIED') return t('purchase.notBuyer');
      if (code === 'FILE_UPLOAD_NOT_ALLOWED' || code === 'FILE_CONTENT_TYPE_MISMATCH') {
        return t('purchase.uploadNotAllowed');
      }
      if (code === 'FILE_STORAGE_UNAVAILABLE' || err.message.includes('EVIDENCE_UPLOAD_FAILED')) {
        return t('purchase.uploadFailed');
      }
      if (err.message.includes('EVIDENCE_UPLOAD_SIZE_UNKNOWN')) return t('purchase.uploadUnreadable');
      if (!code && err.status === 0) return t('purchase.uploadFailed');
      if (err.message) return err.message;
    }
    if (err instanceof Error) {
      if (err.message.includes('EVIDENCE_UPLOAD_FAILED')) return t('purchase.uploadFailed');
      if (err.message.includes('EVIDENCE_UPLOAD_SIZE_UNKNOWN')) return t('purchase.uploadUnreadable');
    }
    return t('common.error');
  };

  const submit = async () => {
    setError(null);
    if (!request) return;
    const items = Object.entries(lines)
      .map(([purchaseRequestItemId, line]) => ({
        purchaseRequestItemId,
        purchasedQuantity: Number(line.quantity.replace(',', '.')) || 0,
        unitPrice: Number(line.unitPrice.replace(/[.,\s]/g, '')) || 0,
      }))
      .filter((line) => line.purchasedQuantity > 0);
    if (items.length === 0) return setError(t('purchase.qtyRequired'));
    // Hoá đơn là bằng chứng chi phí (BR-26) — bắt buộc ít nhất 1 ảnh.
    if (photos.length === 0) {
      setPhotoError(true);
      return setError(t('purchase.invoiceRequired'));
    }

    setUploading(true);
    try {
      // Upload từng ảnh hoá đơn trước (purpose `PurchaseReceipt`), rồi mới ghi nhận.
      const receiptFileIds: string[] = [];
      for (const uri of photos) receiptFileIds.push(await uploadPurchaseReceipt(uri));

      await record.mutateAsync({
        requestId: request.id,
        supplierName: supplier,
        purchaseDate: date || undefined,
        items,
        receiptFileIds,
      });
      toast(t('purchase.recorded'));
      navigation.goBack();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={t('purchase.record')} sub={params.taskName} />

        {isPending || !request ? (
          <AppText variant="sub">{t('common.loading')}</AppText>
        ) : request.items.length === 0 ? (
          <EmptyState text={t('purchase.noItems')} />
        ) : (
          <>
            <Card style={styles.card}>
              <AppText variant="label">{t('purchase.supplier')}</AppText>
              <TextInput
                value={supplier}
                onChangeText={setSupplier}
                placeholder={t('purchase.supplierHint')}
                placeholderTextColor={colors.faint}
                maxLength={150}
                style={styles.input}
              />
              <AppText variant="label" style={styles.gap}>
                {t('purchase.date')}
              </AppText>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.faint}
                autoCapitalize="none"
                style={styles.input}
              />
            </Card>

            {request.items.map((item) => (
              <Card key={item.id} style={styles.card}>
                <AppText variant="h2">
                  {item.materialName}{' '}
                  <AppText variant="sub">({item.unit})</AppText>
                </AppText>
                <AppText variant="sub">
                  {t('purchase.requested', { qty: item.requestedQuantity, unit: item.unit })}
                </AppText>
                <View style={styles.lineRow}>
                  <View style={styles.lineCol}>
                    <AppText variant="label">{t('purchase.boughtQty')}</AppText>
                    <TextInput
                      value={lines[item.id]?.quantity ?? ''}
                      onChangeText={(value) =>
                        setLines((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], quantity: value },
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.lineCol}>
                    <AppText variant="label">{t('purchase.unitPrice')}</AppText>
                    <TextInput
                      value={lines[item.id]?.unitPrice ?? ''}
                      onChangeText={(value) =>
                        setLines((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], unitPrice: value },
                        }))
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                    />
                  </View>
                </View>
              </Card>
            ))}

            <Card style={styles.card}>
              <AppText variant="h2">
                {t('purchase.total')}: {fmtMoney(total)} đ
              </AppText>
              <AppText variant="sub" style={styles.gap}>
                {t('purchase.stockHint')}
              </AppText>
            </Card>

            <Card style={styles.card}>
              <PhotoPicker
                photos={photos}
                onChange={(next) => {
                  setPhotos(next);
                  if (next.length > 0) setPhotoError(false);
                }}
                error={photoError}
                label={t('purchase.invoice')}
                hint={t('purchase.invoiceHint')}
                max={5}
              />
            </Card>

            {!canRecord && (
              <AppText variant="sub" style={styles.warn}>
                {t('purchase.requestNotApproved', { status: request.status })}
              </AppText>
            )}
            {error && (
              <AppText variant="sub" style={styles.warn}>
                {error}
              </AppText>
            )}

            <Button
              label={t('common.save')}
              onPress={() => void submit()}
              disabled={uploading || record.isPending || !canRecord}
              loading={uploading || record.isPending}
              style={styles.submit}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  card: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    backgroundColor: colors.panel,
    marginTop: spacing.xs,
  },
  gap: { marginTop: spacing.sm },
  lineRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  lineCol: { flex: 1 },
  warn: { color: colors.dangerFg, marginBottom: spacing.sm },
  submit: { marginTop: spacing.sm },
});
