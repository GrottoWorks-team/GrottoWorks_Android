// Chi tiết nhiệm vụ đang tuyển: thông tin + kỹ năng + tiêu chí, cùng hành động
// đăng ký tham gia (gửi VolunteerReg PENDING) hoặc rút đơn khi còn chờ duyệt.
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusTag } from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  useAreas,
  useCancelRegistration,
  useMyReg,
  useRegisterForTask,
  useTask,
  useTaskMaterials,
} from '../../api/hooks';
import { assignmentStatus, skillMatchScore } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type DetailRoute = RouteProp<TasksStackParamList, 'OpenDetail'>;

export function OpenTaskDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { params } = useRoute<DetailRoute>();
  const volunteerId = user?.id ?? '';

  const { data: task, isPending } = useTask(params.taskId);
  const { data: areas = [] } = useAreas();
  const { data: materials = [] } = useTaskMaterials();
  const { data: myReg } = useMyReg(params.taskId, volunteerId);
  const register = useRegisterForTask(volunteerId);
  const cancel = useCancelRegistration(volunteerId);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

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
  const taskMaterials = materials.filter((m) => task.materialIds.includes(m.id));
  const joined = task.assignees.includes(volunteerId) || assignmentStatus(task, volunteerId) === 'ACCEPTED';
  const slotsLeft = Math.max(0, task.volunteersNeeded - task.assignees.length);
  const isFull = slotsLeft === 0 && !joined;
  const match = user ? skillMatchScore(task, user) : 0;

  const onRegister = async () => {
    try {
      await register.mutateAsync({ taskId: task.id, note: note.trim() || undefined });
      setOpen(false);
      setNote('');
      toast(t('open.registered', { name: task.title }));
    } catch {
      toast(t('common.error'), 'alert');
    }
  };

  const onCancel = () => {
    if (!myReg) return;
    Alert.alert(t('open.cancelReg'), t('open.cancelRegConfirm', { name: task.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('open.cancelReg'),
        style: 'destructive',
        onPress: () => {
          cancel.mutate(myReg.id, {
            onSuccess: () => toast(t('open.canceled', { name: task.title })),
            onError: () => toast(t('common.error'), 'alert'),
          });
        },
      },
    ]);
  };

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
          <Field label={t('tasks.taken')} value={String(task.assignees.length)} />
          <Field label={t('tasks.slotsLeft', { n: slotsLeft })} value={String(slotsLeft)} />
          <Field label={t('tasks.dueDate')} value={task.dueDate} />
        </Card>

        {task.skills.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.labelRow}>
              <AppText variant="label">{t('tasks.skills')}</AppText>
              {match >= 0.5 ? (
                <AppText variant="sub" color={colors.passedFg}>
                  ★ {t('tasks.skillsGoodMatch')}
                </AppText>
              ) : null}
            </View>
            <View style={styles.chips}>
              {task.skills.map((s) => {
                const hit = user?.skills.includes(s);
                return (
                  <View key={s} style={[styles.tag, hit ? styles.tagHit : null]}>
                    <AppText variant="sub" color={hit ? colors.passedFg : colors.ink}>
                      {hit ? '✓ ' : ''}
                      {s}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {task.completionCriteria ? (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.completionCriteria')}</AppText>
            <AppText variant="body" style={styles.body}>
              {task.completionCriteria}
            </AppText>
          </Card>
        ) : null}

        {taskMaterials.length > 0 && (
          <Card style={styles.card}>
            <AppText variant="label">{t('tasks.materials')}</AppText>
            <View style={styles.chips}>
              {taskMaterials.map((m) => (
                <View key={m.id} style={styles.tag}>
                  <AppText variant="sub">{m.name}</AppText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Trạng thái đăng ký / hành động */}
        {joined ? (
          <Card style={[styles.card, styles.okCard]}>
            <AppText variant="h2" color={colors.passedFg}>
              ✓ {t('open.alreadyAssigned')}
            </AppText>
          </Card>
        ) : myReg && myReg.status === 'PENDING' ? (
          <Card style={[styles.card, styles.pendingCard]}>
            <View style={styles.regTop}>
              <AppText variant="label">{t('open.regTitle')}</AppText>
              <StatusTag status="REG_PENDING" />
            </View>
            <AppText variant="sub">{t('open.regPending')}</AppText>
            {myReg.note ? (
              <AppText variant="sub">
                {t('regs.note')}: {myReg.note}
              </AppText>
            ) : null}
            <Button
              label={t('open.cancelReg')}
              variant="outline"
              onPress={onCancel}
              loading={cancel.isPending}
              style={styles.actionBtn}
            />
          </Card>
        ) : myReg && myReg.status === 'REJECTED' ? (
          <Card style={[styles.card, styles.rejectCard]}>
            <View style={styles.regTop}>
              <AppText variant="label">{t('open.regTitle')}</AppText>
              <StatusTag status="REJECTED" />
            </View>
            <AppText variant="sub">{t('open.regRejected')}</AppText>
            {myReg.rejectReason ? (
              <AppText variant="sub" color={colors.dangerFg}>
                {t('open.regRejectReason', { reason: myReg.rejectReason })}
              </AppText>
            ) : null}
          </Card>
        ) : isFull ? (
          <Card style={styles.card}>
            <AppText variant="sub">{t('open.full')}</AppText>
          </Card>
        ) : (
          <Button label={t('open.register')} onPress={() => setOpen(true)} style={styles.card} />
        )}
      </ScrollView>

      {/* Modal gửi đơn đăng ký (lời nhắn cho trưởng khu — không bắt buộc). */}
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <AppText variant="h2">{t('open.registerTitle')}</AppText>
            <AppText variant="sub">{task.title}</AppText>
            <AppText variant="label" style={styles.modalLabel}>
              {t('open.registerNote')} {t('open.registerNoteOptional')}
            </AppText>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('open.registerNotePlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.textarea}
            />
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="outline"
                onPress={() => setOpen(false)}
                style={styles.flex1}
              />
              <Button
                label={t('open.register')}
                onPress={onRegister}
                loading={register.isPending}
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
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tag: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.canvas,
  },
  tagHit: { borderColor: colors.passedFg, backgroundColor: colors.passedBg },
  pendingCard: { borderColor: colors.pendingFg },
  okCard: { borderColor: colors.passedFg, backgroundColor: colors.passedBg },
  rejectCard: { borderColor: colors.dangerFg },
  regTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionBtn: { marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex1: { flex: 1 },
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
    gap: spacing.sm,
  },
  modalLabel: { marginTop: spacing.sm },
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
});
