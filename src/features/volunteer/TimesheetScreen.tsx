// Chấm công dạng lịch: lưới tháng đánh dấu ngày có giờ công / có việc đến hạn.
// Chọn 1 ngày → hiện giờ công ngày đó + việc cần làm (task chưa xong đến hạn).
// Kèm nút vào/ra ca và yêu cầu chỉnh giờ (như trước).
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusTag } from '../../components/StatusTag';
import { Calendar } from '../../components/Calendar';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  useCheckIn,
  useCheckOut,
  useMyTasks,
  useMyTimesheets,
  useRequestCorrection,
} from '../../api/hooks';
import type { Timesheet } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};

export function TimesheetScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const volunteerId = user?.id ?? '';
  const { data: timesheets = [] } = useMyTimesheets(volunteerId);
  const { data: tasks = [] } = useMyTasks(volunteerId);
  const checkIn = useCheckIn(volunteerId);
  const checkOut = useCheckOut(volunteerId);
  const correction = useRequestCorrection(volunteerId);

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayIso());

  const [fixing, setFixing] = useState<Timesheet | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  const openSession = timesheets.find((ts) => ts.status === 'OPEN');
  const totalHours = timesheets.reduce((s, ts) => s + ts.hours, 0);

  // Đánh dấu theo ngày cho lịch.
  const marks = useMemo(() => {
    const m: Record<string, { hasHours: boolean; hasTask: boolean }> = {};
    for (const ts of timesheets) {
      m[ts.date] = { hasHours: true, hasTask: m[ts.date]?.hasTask ?? false };
    }
    for (const task of tasks) {
      if (task.status === 'DONE') continue;
      const d = task.dueDate.slice(0, 10);
      m[d] = { hasHours: m[d]?.hasHours ?? false, hasTask: true };
    }
    return m;
  }, [timesheets, tasks]);

  const dayTimesheets = timesheets.filter((ts) => ts.date === selected);
  const dayHours = dayTimesheets.reduce((s, ts) => s + ts.hours, 0);
  const dayTasks = tasks.filter((task) => task.dueDate.slice(0, 10) === selected && task.status !== 'DONE');

  const onPrevMonth = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  const onNextMonth = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));

  const onCheckIn = async () => {
    const ts = await checkIn.mutateAsync();
    toast(t('timesheets.checkedIn', { time: ts.checkIn }));
  };
  const onCheckOut = async () => {
    const ts = await checkOut.mutateAsync();
    toast(t('timesheets.checkedOut', { time: ts.checkOut ?? '' }));
  };

  const onCorrection = async () => {
    if (!fixing) return;
    if (!note.trim()) return setNoteError(true);
    await correction.mutateAsync({ id: fixing.id, note: note.trim() });
    setFixing(null);
    setNote('');
    toast(t('timesheets.correctionSent'));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('timesheets.title')} sub={t('timesheets.sub')} />

        {/* Tổng giờ + nút vào/ra ca */}
        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <View>
              <AppText variant="label">{t('timesheets.totalHours')}</AppText>
              <AppText variant="h1">
                {Math.round(totalHours * 10) / 10}
                {t('tasks.hours')}
              </AppText>
            </View>
            {openSession ? (
              <View style={styles.openBadge}>
                <AppText variant="sub" color={colors.pine}>
                  {t('timesheets.openSession')}
                </AppText>
              </View>
            ) : null}
          </View>
          {openSession ? (
            <Button
              label={t('timesheets.checkOutAction')}
              variant="danger"
              onPress={onCheckOut}
              loading={checkOut.isPending}
            />
          ) : (
            <Button
              label={t('timesheets.checkInAction')}
              onPress={onCheckIn}
              loading={checkIn.isPending}
            />
          )}
        </Card>

        {/* Lịch tháng */}
        <Card style={styles.card}>
          <Calendar
            year={view.year}
            month={view.month}
            selected={selected}
            marks={marks}
            onSelect={setSelected}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
          />
        </Card>

        {/* Chi tiết ngày được chọn */}
        <View style={styles.section}>
          <AppText variant="label">{selected}</AppText>

          <Card style={styles.card}>
            <AppText variant="label">{t('calendar.selected.hours')}</AppText>
            {dayTimesheets.length > 0 ? (
              <>
                <AppText variant="h1">
                  {Math.round(dayHours * 10) / 10}
                  {t('tasks.hours')}
                </AppText>
                {dayTimesheets.map((ts) => (
                  <View key={ts.id} style={styles.tsRow}>
                    <AppText variant="sub">
                      {t('timesheets.checkIn')}: {ts.checkIn}
                      {ts.checkOut ? ` · ${t('timesheets.checkOut')}: ${ts.checkOut}` : ''}
                    </AppText>
                    <StatusTag status={ts.status} />
                    {ts.status === 'CLOSED' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        label={t('timesheets.requestCorrection')}
                        onPress={() => setFixing(ts)}
                      />
                    ) : null}
                  </View>
                ))}
              </>
            ) : (
              <AppText variant="sub">{t('calendar.selected.noHours')}</AppText>
            )}
          </Card>

          <Card style={styles.card}>
            <AppText variant="label">{t('calendar.selected.tasks')}</AppText>
            {dayTasks.length > 0 ? (
              dayTasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <AppText variant="h2" style={styles.flex1}>
                    {task.title}
                  </AppText>
                  <StatusTag status={task.status} />
                </View>
              ))
            ) : (
              <AppText variant="sub">{t('calendar.selected.noTasks')}</AppText>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Modal yêu cầu chỉnh giờ */}
      <Modal visible={Boolean(fixing)} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setFixing(null)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <AppText variant="h2">{t('timesheets.requestCorrection')}</AppText>
            <TextInput
              value={note}
              onChangeText={(v) => {
                setNote(v);
                setNoteError(false);
              }}
              multiline
              placeholder={t('timesheets.correctionPlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.textarea}
            />
            {noteError ? (
              <AppText style={styles.errorText}>{t('common.required')}</AppText>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="outline"
                onPress={() => setFixing(null)}
                style={styles.flex1}
              />
              <Button
                label={t('common.confirm')}
                onPress={onCorrection}
                loading={correction.isPending}
                style={styles.flex1}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  summary: { gap: spacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openBadge: {
    borderWidth: 1,
    borderColor: colors.pine,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  card: { gap: spacing.sm },
  section: { gap: spacing.sm },
  tsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
    gap: spacing.md,
  },
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
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
