// Trang chủ TNV: giờ đóng góp (nổi bật), lời mời đang chờ, đơn đăng ký của tôi,
// gợi ý task đang tuyển, nhiệm vụ đang làm.
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusTag } from '../../components/StatusTag';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../auth/AuthContext';
import { myAssignmentStatus } from '../../api';
import { useAreas, useMyRegs, useMyTasks, useMyTimesheets, useOpenTasks, useTask } from '../../api/hooks';
import { useRefreshControl } from '../../lib/useRefreshControl';
import { skillMatchScore } from '../../types';
import type { VolunteerReg } from '../../types';
import { colors, fontSize, spacing } from '../../theme/tokens';
import type { MainTabParamList, TasksStackParamList } from '../../navigation/types';

// Trang chủ nằm trong tab navigator; để mở chi tiết task (ở stack tab Nhiệm vụ)
// ta nhảy sang tab Tasks kèm screen lồng → cần composite type.
type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<TasksStackParamList>
>;

export function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const volunteerId = user?.id ?? '';
  const tasksQuery = useMyTasks(volunteerId);
  const { data: tasks = [] } = tasksQuery;
  const timesheetsQuery = useMyTimesheets(volunteerId);
  const { data: timesheets = [] } = timesheetsQuery;
  const regsQuery = useMyRegs(volunteerId);
  const { data: regs = [] } = regsQuery;
  const openTasksQuery = useOpenTasks(volunteerId);
  const { data: openTasks = [] } = openTasksQuery;
  const areasQuery = useAreas();
  const { data: areas = [] } = areasQuery;
  const refresh = useRefreshControl([
    tasksQuery.refetch,
    timesheetsQuery.refetch,
    regsQuery.refetch,
    openTasksQuery.refetch,
    areasQuery.refetch,
  ]);

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—';
  const pendingInvites = tasks.filter((task) => myAssignmentStatus(task, volunteerId) === 'PENDING');
  const activeTasks = tasks.filter((task) => {
    const s = myAssignmentStatus(task, volunteerId);
    return s === 'ACCEPTED' && task.status !== 'DONE';
  });
  // Mốc "7 ngày trước" chốt 1 lần khi mở màn hình — tránh gọi Date.now() mỗi render.
  const [weekAgoMs] = useState(() => Date.now() - 7 * 86400_000);
  const weekHours = timesheets.reduce(
    (sum, ts) => (new Date(ts.date).getTime() >= weekAgoMs ? sum + ts.hours : sum),
    0,
  );
  const totalHours = timesheets.reduce((sum, ts) => sum + ts.hours, 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const suggested = user
    ? [...openTasks].sort((a, b) => skillMatchScore(b, user) - skillMatchScore(a, user)).slice(0, 3)
    : [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl {...refresh} />}
      >
        <ScreenHeader
          title={t('home.greeting', { name: user?.name ?? '' })}
          sub={t('app.parish')}
        />

        {/* Giờ đóng góp — điểm nhấn chính của trang chủ */}
        <Card style={styles.hoursCard}>
          <AppText variant="label" color={colors.pineLight}>
            {t('home.weekHours')}
          </AppText>
          <View style={styles.hoursRow}>
            <AppText style={styles.hoursValue} color={colors.gold}>
              {round1(weekHours)}
            </AppText>
            <AppText color={colors.gold} style={styles.hoursUnit}>
              {t('tasks.hours')}
            </AppText>
          </View>
          <View style={styles.totalRow}>
            <AppText variant="sub" color={colors.pineLight}>
              {t('home.totalHoursLabel')}
            </AppText>
            <AppText style={styles.totalValue} color={colors.pineLight}>
              {round1(totalHours)} {t('tasks.hours')}
            </AppText>
          </View>
        </Card>

        {pendingInvites.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label">{t('home.pendingInvites')}</AppText>
            {pendingInvites.map((task) => (
              <Card key={task.id} style={styles.inviteCard}>
                <View style={styles.inviteTop}>
                  <AppText variant="h2" style={styles.flex1}>
                    {task.title}
                  </AppText>
                  <StatusTag status="PENDING" />
                </View>
                <AppText variant="sub" style={styles.inviteHint}>
                  {t('tasks.inviteHint')}
                </AppText>
                <Button
                  size="sm"
                  label={t('tasks.detail')}
                  style={styles.inviteBtn}
                  onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                />
              </Card>
            ))}
          </View>
        )}

        {regs.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label">{t('home.myRegs')}</AppText>
            {regs.map((reg) => (
              <RegRow
                key={reg.id}
                reg={reg}
                onPress={() => navigation.navigate('Tasks', { screen: 'OpenDetail', params: { taskId: reg.taskId } })}
              />
            ))}
          </View>
        )}

        {suggested.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label">{t('home.openForYou')}</AppText>
            {suggested.map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <AppText variant="h2">{task.title}</AppText>
                <AppText variant="sub" numberOfLines={1}>
                  {areaName(task.areaId)} · {t('tasks.dueDate')}: {task.dueDate}
                </AppText>
                <Button
                  size="sm"
                  label={t('open.register')}
                  style={styles.inviteBtn}
                  onPress={() => navigation.navigate('Tasks', { screen: 'OpenDetail', params: { taskId: task.id } })}
                />
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <AppText variant="label">{t('home.myTasks')}</AppText>
          {activeTasks.length ? (
            activeTasks.map((task) => (
              <Card key={task.id} style={styles.taskCard}>
                <AppText variant="h2">{task.title}</AppText>
                <View style={styles.taskMeta}>
                  <StatusTag status={task.status} />
                  <AppText variant="sub" style={styles.flex1} numberOfLines={1}>
                    {task.description}
                  </AppText>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <AppText variant="sub">{t('home.noTasks')}</AppText>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function RegRow({ reg, onPress }: { reg: VolunteerReg; onPress: () => void }) {
  const { t } = useTranslation();
  const { data: task } = useTask(reg.taskId);
  const title = task?.title ?? reg.taskId;
  const status = reg.status === 'PENDING' ? 'REG_PENDING' : reg.status;
  return (
    <Card style={styles.taskCard}>
      <View style={styles.inviteTop}>
        <AppText variant="h2" style={styles.flex1} numberOfLines={1}>
          {title}
        </AppText>
        <StatusTag status={status} />
      </View>
      {reg.status === 'REJECTED' && reg.rejectReason ? (
        <AppText variant="sub" color={colors.dangerFg}>
          {t('open.regRejectReason', { reason: reg.rejectReason })}
        </AppText>
      ) : null}
      <Button size="sm" label={t('tasks.detail')} style={styles.inviteBtn} onPress={onPress} />
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.xl },
  hoursCard: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  hoursRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  hoursValue: { fontSize: 56, fontWeight: '800', lineHeight: 60, letterSpacing: -1 },
  hoursUnit: { fontSize: fontSize.h1, fontWeight: '700', marginBottom: 8 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,245,233,0.25)',
    paddingTop: spacing.sm,
  },
  totalValue: { fontSize: fontSize.h2, fontWeight: '700' },
  section: { gap: spacing.sm },
  flex1: { flex: 1 },
  inviteCard: { gap: spacing.sm, borderColor: colors.pendingFg },
  inviteTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  inviteHint: { marginTop: spacing.xs },
  inviteBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  taskCard: { gap: spacing.sm },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
