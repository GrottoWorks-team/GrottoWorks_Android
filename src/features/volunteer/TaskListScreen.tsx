// Tab Nhiệm vụ: 2 sub-tab "Việc của tôi" (task được phân công) và "Đang tuyển"
// (task mở đăng ký). Gộp chung để tránh tách thành tab riêng.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { StatusTag } from '../../components/StatusTag';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../auth/AuthContext';
import { isRealApiActive, myAssignmentStatus } from '../../api';
import { useAreas, useMyAttendanceRequests, useMyTasks, useMyTimesheets, useOpenTasks } from '../../api/hooks';
import { useRefreshControl } from '../../lib/useRefreshControl';
import { skillMatchScore } from '../../types';
import type { Task } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<TasksStackParamList>;
type SubTab = 'mine' | 'open';
type Filter = 'all' | 'pending' | 'doing' | 'done';
/** Lọc "Đang tuyển" theo khu vực: của tôi (cộng đoàn của tôi / nơi tôi đã có việc) hay khu khác cùng giáo xứ. */
type OpenAreaFilter = 'mine' | 'other';

export function TaskListScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const volunteerId = user?.id ?? '';
  const [tab, setTab] = useState<SubTab>('mine');

  const [filter, setFilter] = useState<Filter>('all');
  // Mặc định xem khu vực của mình trước (giống cách TNV thường tìm việc gần nhất).
  const [openAreaFilter, setOpenAreaFilter] = useState<OpenAreaFilter>('mine');

  const tasksQuery = useMyTasks(volunteerId);
  const { data: tasks = [], isPending } = tasksQuery;
  const openQuery = useOpenTasks(volunteerId);
  const { data: openTasks = [], isPending: openPending } = openQuery;
  const areasQuery = useAreas();
  const { data: areas = [] } = areasQuery;
  // Trạng thái "việc của tôi": đơn vào ca đang chờ duyệt / phiên đang mở.
  const requestsQuery = useMyAttendanceRequests(volunteerId);
  const { data: attendanceRequests = [] } = requestsQuery;
  const timesheetsQuery = useMyTimesheets(volunteerId);
  const { data: timesheets = [] } = timesheetsQuery;
  const openSessionAssignmentId = timesheets.find((ts) => ts.status === 'OPEN')?.assignmentId;
  const pendingAssignmentIds = new Set(attendanceRequests.map((row) => row.assignmentId));

  // Kéo xuống để làm mới: trạng thái việc đổi ở web (leader phát hành/duyệt
  // check-in) nên TNV cần tự reload thay vì chờ cache 30s.
  const refresh = useRefreshControl([
    tasksQuery.refetch,
    openQuery.refetch,
    areasQuery.refetch,
    requestsQuery.refetch,
    timesheetsQuery.refetch,
  ]);

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—';

  // Việc này TNV đang trong ca, hay đơn vào ca đang chờ trưởng khu duyệt?
  const sessionState = (task: Task): 'OPEN' | 'PENDING' | undefined => {
    const assignmentId = task.assignments?.find(
      (row) => row.volunteerId === volunteerId,
    )?.assignmentId;
    if (!assignmentId) return undefined;
    if (openSessionAssignmentId === assignmentId) return 'OPEN';
    if (pendingAssignmentIds.has(assignmentId)) return 'PENDING';
    return undefined;
  };

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const s = myAssignmentStatus(task, volunteerId);
      if (filter === 'pending') return s === 'PENDING';
      if (filter === 'doing') return s === 'ACCEPTED' && task.status !== 'DONE';
      if (filter === 'done') return task.status === 'DONE';
      return true;
    });
  }, [tasks, filter, volunteerId]);

  const sortedOpen = useMemo(() => {
    if (!user) return openTasks;
    return [...openTasks].sort((a, b) => skillMatchScore(b, user) - skillMatchScore(a, user));
  }, [openTasks, user]);

  /**
   * "Khu vực của tôi" = khu vực thuộc **cộng đoàn của tôi** (`user.communityId`).
   * Chỉ khi tài khoản chưa khai cộng đoàn mới suy ra từ việc tôi đã được phân công
   * (ACCEPTED) — không tính khu chỉ có đơn bị từ chối, tránh gộp sai "khu vực của tôi".
   * Phần còn lại là "khu vực khác trong giáo xứ" (`GET /seasons/{id}/work-areas`
   * chỉ trả khu của giáo xứ đang chọn).
   */
  const myAreaIds = useMemo(() => {
    const ids = new Set<string>();
    if (user?.communityId) {
      areas
        .filter((area) => area.communityId === user.communityId)
        .forEach((area) => ids.add(area.id));
      return ids;
    }
    tasks
      .filter((task) => myAssignmentStatus(task, volunteerId) === 'ACCEPTED')
      .forEach((task) => ids.add(task.areaId));
    return ids;
  }, [areas, user, tasks, volunteerId]);

  const openFiltered = useMemo(
    () =>
      sortedOpen.filter((task) =>
        openAreaFilter === 'mine' ? myAreaIds.has(task.areaId) : !myAreaIds.has(task.areaId),
      ),
    [sortedOpen, myAreaIds, openAreaFilter],
  );

  // BE chưa trả trạng thái phân công → ẩn bộ lọc "Chờ duyệt" khi dùng dữ liệu thật.
  const realMode = isRealApiActive();  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('tasks.filter.all') },
    ...(realMode ? [] : [{ key: 'pending' as Filter, label: t('tasks.filter.pending') }]),
    { key: 'doing', label: t('tasks.filter.doing') },
    { key: 'done', label: t('tasks.filter.done') },
  ];

  return (
    <Screen>
            <View style={styles.header}>
        <ScreenHeader
          title={t('tasks.title')}
          sub={tab === 'mine' ? t('tasks.sub') : t('open.sub')}
        />
      </View>

      {/* Sub-tab: Việc của tôi | Đang tuyển */}
      <View style={styles.subTabs}>
        <SubTabBtn
          label={t('tasks.subtab.mine')}
          active={tab === 'mine'}
          onPress={() => setTab('mine')}
        />
        <SubTabBtn
          label={t('tasks.subtab.open')}
          active={tab === 'open'}
          badge={openTasks.length}
          onPress={() => setTab('open')}
        />
      </View>

      {tab === 'mine' ? (
        <>
          <View style={styles.chips}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, filter === f.key ? styles.chipActive : null]}
              >
                <AppText
                  variant="h2"
                  style={styles.chipText}
                  color={filter === f.key ? '#FFFFFF' : colors.ink}
                >
                  {f.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(task) => task.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl {...refresh} />}
            ListEmptyComponent={
              <EmptyState text={isPending ? t('common.loading') : t('home.noTasks')} />
            }
            renderItem={({ item }) => (
              <TaskRow
                task={item}
                area={areaName(item.areaId)}
                status={myAssignmentStatus(item, volunteerId)}
                session={sessionState(item)}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              />
            )}
          />
        </>
      ) : (
        <>
          {/* Lọc khu vực: của tôi | khu vực khác cùng giáo xứ */}
          <View style={styles.chips}>
            {([
              { key: 'mine' as OpenAreaFilter, label: t('open.area.mine') },
              { key: 'other' as OpenAreaFilter, label: t('open.area.other') },
            ]).map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setOpenAreaFilter(option.key)}
                style={[styles.chip, openAreaFilter === option.key ? styles.chipActive : null]}
              >
                <AppText
                  variant="h2"
                  style={styles.chipText}
                  color={openAreaFilter === option.key ? '#FFFFFF' : colors.ink}
                >
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={openFiltered}
            keyExtractor={(task) => task.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl {...refresh} />}
            ListEmptyComponent={
              <EmptyState
                text={
                  openPending
                    ? t('common.loading')
                    : openAreaFilter === 'mine'
                      ? t('open.emptyMine')
                      : t('open.emptyOther')
                }
              />
            }
            renderItem={({ item }) => (
              <OpenRow
                task={item}
                area={areaName(item.areaId)}
                match={user ? skillMatchScore(item, user) : 0}
                onPress={() => navigation.navigate('OpenDetail', { taskId: item.id })}
              />
            )}
          />
        </>
      )}
    </Screen>
  );
}

function SubTabBtn({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.subTab, active ? styles.subTabActive : null]}>
      <AppText variant="h2" color={active ? colors.pine : colors.muted}>
        {label}
      </AppText>
      {typeof badge === 'number' && badge > 0 ? (
        <View style={styles.badge}>
          <AppText variant="sub" color="#FFFFFF">
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function TaskRow({
  task,
  area,
  status,
  session,
  onPress,
}: {
  task: Task;
  area: string;
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  session?: 'OPEN' | 'PENDING';
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const inSession = session === 'OPEN';
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <AppText variant="h2" style={styles.flex1}>
            {task.title}
          </AppText>
          <StatusTag status={task.status} />
        </View>
        <TaskTypeBadge task={task} />
        <AppText variant="sub" numberOfLines={1}>
          {area} · {t('tasks.dueDate')}: {task.dueDate}
        </AppText>
        {/* Trạng thái thực tế của TNV: đang trong ca / đơn vào ca chờ duyệt. */}
        {session ? (
          <View style={inSession ? styles.sessionOpen : styles.sessionPending}>
            <AppText variant="sub" color={inSession ? colors.passedFg : colors.pendingFg}>
              {inSession ? t('tasks.sessionOpen') : t('tasks.sessionPending')}
            </AppText>
          </View>
        ) : null}
        {status === 'PENDING' ? <StatusTag status="PENDING" /> : null}
        {status === 'DECLINED' ? <StatusTag status="DECLINED" /> : null}
      </Card>
    </Pressable>
  );
}

function OpenRow({
  task,
  area,
  match,
  onPress,
}: {
  task: Task;
  area: string;
  match: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const slotsLeft = Math.max(0, task.volunteersNeeded - task.assignees.length);
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <AppText variant="h2" style={styles.flex1}>
            {task.title}
          </AppText>
          {match >= 0.5 ? (
            <View style={styles.matchBadge}>
              <AppText variant="sub" color={colors.passedFg}>
                ★ {Math.round(match * 100)}%
              </AppText>
            </View>
          ) : null}
        </View>
        <TaskTypeBadge task={task} />
        <AppText variant="sub" numberOfLines={1}>
          {area} · {t('tasks.dueDate')}: {task.dueDate}
        </AppText>
        <View style={styles.metaRow}>
          <View style={styles.slotTag}>
            <AppText variant="sub" color={colors.pine}>
              {t('tasks.slotsLeft', { n: slotsLeft })}
            </AppText>
          </View>
          {task.skills.map((s) => (
            <View key={s} style={styles.skillTag}>
              <AppText variant="sub">{s}</AppText>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

/** Nhãn loại việc: chỉ hiện với việc đặc biệt (đi mua / khắc phục), việc thường để trống. */
function TaskTypeBadge({ task }: { task: Task }) {
  const { t } = useTranslation();
  const type = task.taskType ?? 'WORK';
  if (type === 'WORK') return null;
  const label = type === 'PURCHASE' ? t('tasks.typePurchase') : t('tasks.typeCorrective');
  return (
    <View style={styles.typeBadge}>
      <AppText variant="sub" color={colors.ink}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  subTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  subTabActive: { backgroundColor: colors.panel },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
  },
  chipActive: { backgroundColor: colors.pine, borderColor: colors.pine },
  chipText: { fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.sm },
  sessionOpen: {
    alignSelf: 'flex-start',
    backgroundColor: colors.passedBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  sessionPending: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pendingBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex1: { flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  matchBadge: {
    backgroundColor: colors.passedBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.goldLight,
    borderColor: colors.gold,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  slotTag: {
    backgroundColor: colors.pineLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  skillTag: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    backgroundColor: colors.canvas,
  },
});
