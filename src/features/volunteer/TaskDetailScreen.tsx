// Chi tiết nhiệm vụ (TNV): info + tiêu chí hoàn thành + kỹ năng + vật tư,
// và hành động theo trạng thái phân công của chính TNV (nhận/từ chối/gửi duyệt).
import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PhotoGallery, PhotoPicker } from '../../components/PhotoPicker';
import { StatusTag } from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { isRealApiActive, myAssignmentStatus, ApiError } from '../../api';
import {
  useAreas,
  useCancelAttendanceRequest,
  useCheckIn,
  useCheckOut,
  useMyAttendanceRequests,
  useMyTimesheets,
  useRespondAssignment,
  usePurchaseRequest,
  useSubmitReview,
  useTask,
  useTaskMaterials,
  useTaskProgress,
} from '../../api/hooks';
import { useRefreshControl } from '../../lib/useRefreshControl';
import { colors, radius, spacing } from '../../theme/tokens';
import type { MainTabParamList, TasksStackParamList } from '../../navigation/types';

type DetailRoute = RouteProp<TasksStackParamList, 'TaskDetail'>;
type DetailNav = NativeStackNavigationProp<TasksStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { params } = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNav>();
  const volunteerId = user?.id ?? '';

  const taskQuery = useTask(params.taskId);
  const { data: task, isPending, isError } = taskQuery;
  const areasQuery = useAreas();
  const { data: areas = [] } = areasQuery;
  const { data: materials = [] } = useTaskMaterials();
  const timesheetsQuery = useMyTimesheets(volunteerId);
  const { data: timesheets = [] } = timesheetsQuery;
  const requestsQuery = useMyAttendanceRequests(volunteerId);
  const { data: attendanceRequests = [] } = requestsQuery;
  const respond = useRespondAssignment(volunteerId);
  const submitReview = useSubmitReview(volunteerId, params.taskId);
  const checkIn = useCheckIn(volunteerId);
  const checkOut = useCheckOut(volunteerId);
  const cancelRequest = useCancelAttendanceRequest(volunteerId);
  const { data: progress = [] } = useTaskProgress(params.taskId);
  // Việc đi mua: task mang `purchaseRequestId` → tải đơn mua để hiện "Vật tư cần mua"
  // (trước 12/11/2026 TNV không thấy ở đây, chỉ thấy trong màn Ghi nhận mua).
  const purchaseRequestId = task?.purchaseRequestId ?? undefined;
  const { data: purchaseRequest } = usePurchaseRequest(purchaseRequestId);
  const refresh = useRefreshControl([
    taskQuery.refetch,
    areasQuery.refetch,
    timesheetsQuery.refetch,
    requestsQuery.refetch,
  ]);
  // BE không trả assignment trong TaskDto nhưng `/users/me/tasks` chỉ chứa task
  // TNV đã được phân công → ở chế độ thật coi trạng thái là ACCEPTED.
  // (Màn "task đang tuyển" dùng OpenTaskDetailScreen, không đi qua đây.)
  const realMode = isRealApiActive();

  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isPending) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="sub">{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  // BE trả 403/404 khi nhiệm vụ ngoài phạm vi của TNV → báo lỗi thay vì treo.
  if (isError || !task) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="sub">{t('common.error')}</AppText>
        </View>
      </Screen>
    );
  }

  const area = areas.find((a) => a.id === task.areaId);
  const myStatus = myAssignmentStatus(task, volunteerId);
  // Trưởng nhóm nhiệm vụ: BE trả `teamLeaderAssignmentId`; so với assignment của chính TNV.
  const hasTeamLeader = Boolean(task.teamLeaderAssignmentId);
  const isTeamLeader = Boolean(
    hasTeamLeader &&
      task.assignments?.some(
        (row) =>
          row.volunteerId === volunteerId &&
          row.assignmentId === task.teamLeaderAssignmentId,
      ),
  );
  const taskMaterials = materials.filter((m) => task.materialIds.includes(m.id));

  const onAccept = async () => {
    try {
      await respond.mutateAsync({ taskId: task.id, status: 'ACCEPTED' });
      toast(t('tasks.accepted', { name: task.title }));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert');
    }
  };

  const onDecline = async () => {
    if (!reason.trim()) return setReasonError(true);
    try {
      await respond.mutateAsync({ taskId: task.id, status: 'DECLINED', note: reason.trim() });
      setDeclining(false);
      setReason('');
      toast(t('tasks.declined', { name: task.title }));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert');
    }
  };

  const onSubmitReview = async () => {
    if (!note.trim()) return setNoteError(true);
    if (photos.length === 0) return setPhotoError(true);
    setSubmitError(null);
    try {
      await submitReview.mutateAsync({ note: note.trim(), photoUris: photos });
      setReviewing(false);
      setNote('');
      setPhotos([]);
      toast(t('tasks.reviewSubmitted', { name: task.title }));
    } catch (error) {
      // Không im lặng: hiện lỗi ngay trong modal (toast có thể bị modal che).
      const raw = error instanceof ApiError ? error.message : '';
      const friendly =
        (error instanceof ApiError && error.status === 0) ||
        /EVIDENCE_UPLOAD|UPLOAD_SIZE/i.test(raw)
          ? t('tasks.evidenceUploadFailed')
          : raw || t('common.error');
      setSubmitError(friendly);
      toast(friendly, 'alert');
    }
  };

  const openReview = () => {
    setNoteError(false);
    setPhotoError(false);
    setSubmitError(null);
    setReviewing(true);
  };

  // Vào ca: BE tạo đơn PENDING chờ trưởng khu duyệt (việc chỉ IN_PROGRESS sau khi duyệt).
  const openSession = timesheets.find((ts) => ts.status === 'OPEN');
  const myAssignmentId = task.assignments?.find((row) => row.volunteerId === volunteerId)?.assignmentId;
  const pendingRequest = attendanceRequests.find(
    (row) => row.assignmentId === myAssignmentId,
  );
  const canStartWork =
    myStatus === 'ACCEPTED' &&
    (task.backendStatus === 'NOT_STARTED' || task.backendStatus === 'IN_PROGRESS');

  const onCancelRequest = async () => {
    if (!pendingRequest) return;
    try {
      await cancelRequest.mutateAsync({
        requestId: pendingRequest.id,
        version: pendingRequest.version,
      });
      toast(t('tasks.checkInCancelled'));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert');
    }
  };

  const onCheckIn = async () => {
    try {
      const result = await checkIn.mutateAsync({ taskId: task.id });
      toast(
        result.pendingApproval
          ? t('tasks.checkInPending')
          : t('timesheets.checkedIn', { time: result.timesheet?.checkIn ?? '' }),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // 409 ATTENDANCE_ALREADY_OPEN = đã có đơn chờ duyệt hoặc phiên đang mở.
        toast(t('tasks.checkInAlready'), 'alert');
        return;
      }
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert');
    }
  };

  const onCheckOut = async () => {
    try {
      const result = await checkOut.mutateAsync();
      toast(t('timesheets.checkedOut', { time: result.timesheet?.checkOut ?? '' }));
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert');
    }
  };

  const canSubmitReview =
    myStatus === 'ACCEPTED' &&
    (task.status === 'DOING' || task.status === 'REVISE') &&
    (!hasTeamLeader || isTeamLeader);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl {...refresh} />}
      >
        <View style={styles.titleBlock}>
          <AppText variant="h1">{task.title}</AppText>
          <View style={styles.titleTags}>
            <StatusTag status={task.status} />
            {isTeamLeader ? (
              <View style={styles.leaderBadge}>
                <AppText variant="label" color={colors.pine}>
                  {t('tasks.teamLeaderBadge')}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        <Card style={styles.card}>
          <AppText variant="sub">{task.description}</AppText>
        </Card>

        <Card style={styles.card}>
          <Field label={t('tasks.area')} value={area?.name ?? '—'} />
          <Field label={t('tasks.estimateHours')} value={`${task.estimateHours} ${t('tasks.hours')}`} />
          <Field label={t('tasks.volunteersNeeded')} value={String(task.volunteersNeeded)} />
          <Field
            label={t('tasks.startAt')}
            value={task.startAt ? task.startAt.slice(0, 10) : t('tasks.startAtNone')}
          />
          <Field label={t('tasks.dueDate')} value={task.dueDate} />
        </Card>

        {/* Mô hình 3D của khu vực — TNV xem mô hình + lớp thi công gắn với nhiệm vụ
            đã nhận. Mở MÀN HÌNH TRONG APP (không nhảy ra trình duyệt). Dữ liệu
            hiện là scene mock vì BE chưa có API mô hình 3D. */}
        {myStatus === 'ACCEPTED' && task.areaId ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.model3dTitle')}</AppText>
            <AppText variant="sub">{t('tasks.model3dHint')}</AppText>
            <Button
              label={t('tasks.model3dOpen')}
              onPress={() =>
                navigation.navigate('TaskModel', {
                  taskId: task.id,
                  areaId: task.areaId ?? '',
                  areaName: area?.name,
                  taskTitle: task.title,
                })
              }
            />
          </Card>
        ) : null}

        {task.completionCriteria ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.completionCriteria')}</AppText>
            <AppText variant="body" style={styles.body}>
              {task.completionCriteria}
            </AppText>
          </Card>
        ) : null}

        {task.skills.length > 0 && (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.skills')}</AppText>
            <View style={styles.chips}>
              {task.skills.map((s) => (
                <View key={s} style={styles.tag}>
                  <AppText variant="sub">{s}</AppText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Vật tư cần cho nhiệm vụ (kèm số lượng nếu có). */}
        {taskMaterials.length > 0 && (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.materials')}</AppText>
            <View style={styles.chips}>
              {taskMaterials.map((m) => {
                const qty = task.materialNeeds?.[m.id];
                return (
                  <View key={m.id} style={styles.tag}>
                    <AppText variant="sub">
                      {m.name}
                      {typeof qty === 'number' && qty > 0 ? ` ×${qty} ${m.unit}` : ''}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Việc ĐI MUA: hiện đúng danh sách vật tư + số lượng của đơn mua để TNV
            biết cần mua gì, kèm lối tắt sang màn "Ghi nhận lần mua". */}
        {task.taskType === 'PURCHASE' && purchaseRequest ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.purchaseTitle')}</AppText>
            <AppText variant="sub">{t('tasks.purchaseHint')}</AppText>
            {purchaseRequest.items.map((item) => (
              <View key={item.id} style={styles.purchaseRow}>
                <AppText variant="h2" style={styles.purchaseName}>
                  {item.materialName}
                </AppText>
                <AppText variant="sub">
                  {t('purchase.requested', { qty: item.requestedQuantity, unit: item.unit })}
                </AppText>
                {typeof item.estimatedCost === 'number' && item.estimatedCost > 0 ? (
                  <AppText variant="sub">
                    {t('tasks.purchaseEstimate', {
                      amount: item.estimatedCost.toLocaleString('vi-VN'),
                    })}
                  </AppText>
                ) : null}
              </View>
            ))}
            {myStatus === 'ACCEPTED' ? (
              <Button
                label={t('purchase.record')}
                onPress={() => {
                  const tabs =
                    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
                  tabs?.navigate('Profile', {
                    screen: 'RecordPurchase',
                    params: {
                      requestId: purchaseRequest.id,
                      taskName: task.title,
                    },
                  });
                }}
                style={styles.purchaseAction}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Hành động theo trạng thái phân công của TNV */}
        {myStatus === 'PENDING' && (
          <Card style={[styles.card, styles.inviteCard]}>
            <AppText variant="label">{t('tasks.inviteTitle')}</AppText>
            <AppText variant="sub">{t('tasks.inviteHint')}</AppText>
            <View style={styles.actions}>
              <Button
                label={t('tasks.accept')}
                onPress={onAccept}
                loading={respond.isPending}
                style={styles.flex1}
              />
              <Button
                label={t('tasks.decline')}
                variant="danger"
                onPress={() => setDeclining(true)}
                style={styles.flex1}
              />
            </View>
          </Card>
        )}
        {canStartWork && (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.workTitle')}</AppText>
            <AppText variant="sub">
              {openSession
                ? t('tasks.workSessionOpen')
                : pendingRequest
                  ? t('tasks.workPendingApproval')
                  : task.backendStatus === 'IN_PROGRESS'
                    ? t('tasks.workInProgress')
                    : t('tasks.workNotStarted')}
            </AppText>
            {openSession ? (
              <Button
                label={t('timesheets.checkOutAction')}
                variant="danger"
                onPress={onCheckOut}
                loading={checkOut.isPending}
              />
            ) : pendingRequest ? (
              <Button
                label={t('tasks.cancelCheckIn')}
                variant="outline"
                onPress={onCancelRequest}
                loading={cancelRequest.isPending}
              />
            ) : (
              <Button
                label={t('tasks.startWork')}
                onPress={onCheckIn}
                loading={checkIn.isPending}
              />
            )}
          </Card>
        )}
        {canSubmitReview && (
          <Button
            label={t('tasks.submitReview')}
            onPress={openReview}
            style={styles.card}
          />
        )}

        {/* Task đã có trưởng nhóm → TNV khác vẫn xem/ vào ca nhưng không nộp tiến độ. */}
        {hasTeamLeader && !isTeamLeader && myStatus === 'ACCEPTED' ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.teamLeaderOnlyTitle')}</AppText>
            <AppText variant="sub">{t('tasks.teamLeaderOnlyHint')}</AppText>
          </Card>
        ) : null}

        {/* BE chưa trả assignmentId → chỉ nhận/từ chối phân công là chưa làm được
            trên app; ghi chú rõ thay vì giả lập thành công. */}
        {realMode && !myStatus && task.status !== 'DONE' ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.bePendingTitle')}</AppText>
            <AppText variant="sub">{t('tasks.bePending')}</AppText>
          </Card>
        ) : null}

        {/* Lịch sử tiến độ / nghiệm thu (BE `GET /tasks/{id}/progress`). */}
        {progress.length > 0 ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.progressTitle')}</AppText>
            {progress.map((entry) => (
              <View key={entry.id} style={styles.progressRow}>
                <AppText variant="sub">
                  {t('tasks.progressItem', {
                    percent: entry.percent,
                    photos: entry.evidenceCount,
                  })}
                </AppText>
                {entry.note ? <AppText variant="sub">{entry.note}</AppText> : null}
                {entry.approvedAt ? (
                  <AppText variant="sub" color={colors.pine}>
                    {t('tasks.progressApproved')}
                  </AppText>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        {/* Ảnh minh chứng đã nộp (cho trưởng khu xem để xác nhận hoàn thành). */}
        {task.submittedPhotoUris && task.submittedPhotoUris.length > 0 ? (
          <Card style={styles.card}>
            <AppText variant="label">
              {t('tasks.submittedPhotos', { n: task.submittedPhotoUris.length })}
            </AppText>
            <PhotoGallery photos={task.submittedPhotoUris} />
            {task.submittedNotes ? (
              <AppText variant="sub" style={styles.body}>
                {t('tasks.reviewNote')}: {task.submittedNotes}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        {myStatus && myStatus !== 'PENDING' && (
          <View style={styles.statusRow}>
            <AppText variant="sub">{t('tasks.myAssignmentStatus')}</AppText>
            <StatusTag status={myStatus} />
          </View>
        )}
      </ScrollView>

      {/* Modal nhập lý do từ chối */}
      <Modal visible={declining} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setDeclining(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <AppText variant="h2">{t('tasks.declineReason')}</AppText>
            <TextInput
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                setReasonError(false);
              }}
              multiline
              placeholder={t('tasks.declineReasonPlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.textarea}
            />
            {reasonError ? (
              <AppText style={styles.errorText}>{t('tasks.declineReasonRequired')}</AppText>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="outline"
                onPress={() => setDeclining(false)}
                style={styles.flex1}
              />
              <Button
                label={t('tasks.decline')}
                variant="danger"
                onPress={onDecline}
                loading={respond.isPending}
                style={styles.flex1}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal gửi duyệt hoàn thành — bắt buộc kèm ảnh minh chứng. */}
      <Modal visible={reviewing} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setReviewing(false)}>
          <Pressable style={[styles.modal, styles.reviewModal]} onPress={() => undefined}>
            <AppText variant="h2">{t('tasks.reviewTitle')}</AppText>
            <ScrollView contentContainerStyle={styles.reviewScroll} keyboardShouldPersistTaps="handled">
              <TextInput
                value={note}
                onChangeText={(v) => {
                  setNote(v);
                  setNoteError(false);
                }}
                multiline
                placeholder={t('tasks.reviewNote')}
                placeholderTextColor={colors.faint}
                style={styles.textarea}
              />
              {noteError ? (
                <AppText style={styles.errorText}>{t('tasks.noteRequired')}</AppText>
              ) : null}
              <PhotoPicker
                photos={photos}
                onChange={(p) => {
                  setPhotos(p);
                  if (p.length > 0) setPhotoError(false);
                }}
                error={photoError}
              />
              {submitError ? (
                <AppText style={styles.errorText}>{submitError}</AppText>
              ) : null}
            </ScrollView>
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="outline"
                onPress={() => setReviewing(false)}
                style={styles.flex1}
              />
              <Button
                label={t('tasks.submitReview')}
                onPress={onSubmitReview}
                loading={submitReview.isPending}
                style={styles.flex1}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="h2">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md },
  titleBlock: { gap: spacing.sm },
  titleTags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  leaderBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  card: { gap: spacing.sm },
  body: { marginTop: spacing.xs },
  field: { gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tag: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.canvas,
  },
  inviteCard: { borderColor: colors.pendingFg },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex1: { flex: 1 },
  purchaseRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
    gap: 2,
  },
  purchaseName: { flexShrink: 1 },
  purchaseAction: { marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressRow: { gap: 2, paddingVertical: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,45,66,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    width: '100%',
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  reviewModal: { maxHeight: '85%' },
  reviewScroll: { gap: spacing.md },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  errorText: { color: colors.dangerFg, fontWeight: '600' },
});
