// Chi tiết nhiệm vụ (TNV): info + tiêu chí hoàn thành + kỹ năng + vật tư,
// và hành động theo trạng thái phân công của chính TNV (nhận/từ chối/gửi duyệt).
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { PhotoGallery, PhotoPicker } from '../../components/PhotoPicker';
import { StatusTag } from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  useAreas,
  useRespondAssignment,
  useSubmitReview,
  useTask,
  useTaskMaterials,
} from '../../api/hooks';
import { assignmentStatus } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type DetailRoute = RouteProp<TasksStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { params } = useRoute<DetailRoute>();
  const volunteerId = user?.id ?? '';

  const { data: task, isPending } = useTask(params.taskId);
  const { data: areas = [] } = useAreas();
  const { data: materials = [] } = useTaskMaterials();
  const respond = useRespondAssignment(volunteerId);
  const submitReview = useSubmitReview(volunteerId, params.taskId);

  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState(false);

  if (isPending || !task) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="sub">{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  const area = areas.find((a) => a.id === task.areaId);
  const myStatus = assignmentStatus(task, volunteerId);
  const taskMaterials = materials.filter((m) => task.materialIds.includes(m.id));

  const onAccept = async () => {
    await respond.mutateAsync({ taskId: task.id, status: 'ACCEPTED' });
    toast(t('tasks.accepted', { name: task.title }));
  };

  const onDecline = async () => {
    if (!reason.trim()) return setReasonError(true);
    await respond.mutateAsync({ taskId: task.id, status: 'DECLINED', note: reason.trim() });
    setDeclining(false);
    setReason('');
    toast(t('tasks.declined', { name: task.title }));
  };

  const onSubmitReview = async () => {
    if (!note.trim()) return setNoteError(true);
    if (photos.length === 0) return setPhotoError(true);
    await submitReview.mutateAsync({ note: note.trim(), photoUris: photos });
    setReviewing(false);
    setNote('');
    setPhotos([]);
    toast(t('tasks.reviewSubmitted', { name: task.title }));
  };

  const openReview = () => {
    setNoteError(false);
    setPhotoError(false);
    setReviewing(true);
  };

  const canSubmitReview =
    myStatus === 'ACCEPTED' && (task.status === 'DOING' || task.status === 'REVISE');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleBlock}>
          <AppText variant="h1">{task.title}</AppText>
          <StatusTag status={task.status} />
        </View>

        <Card style={styles.card}>
          <AppText variant="sub">{task.description}</AppText>
        </Card>

        <Card style={styles.card}>
          <Field label={t('tasks.area')} value={area?.name ?? '—'} />
          <Field label={t('tasks.estimateHours')} value={`${task.estimateHours} ${t('tasks.hours')}`} />
          <Field label={t('tasks.volunteersNeeded')} value={String(task.volunteersNeeded)} />
          <Field label={t('tasks.dueDate')} value={task.dueDate} />
        </Card>

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

        {canSubmitReview && (
          <Button
            label={t('tasks.submitReview')}
            onPress={openReview}
            style={styles.card}
          />
        )}

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
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
