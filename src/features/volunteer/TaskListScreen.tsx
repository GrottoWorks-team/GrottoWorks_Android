// Tab Nhiệm vụ: 2 sub-tab "Việc của tôi" (task được phân công) và "Đang tuyển"
// (task mở đăng ký). Gộp chung để tránh tách thành tab riêng.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
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
import { useAreas, useMyTasks, useOpenTasks } from '../../api/hooks';
import { assignmentStatus, skillMatchScore } from '../../types';
import type { Task } from '../../types';
import { colors, radius, spacing } from '../../theme/tokens';
import type { TasksStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<TasksStackParamList>;
type SubTab = 'mine' | 'open';
type Filter = 'all' | 'pending' | 'doing' | 'done';

export function TaskListScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const volunteerId = user?.id ?? '';
  const [tab, setTab] = useState<SubTab>('mine');

  const [filter, setFilter] = useState<Filter>('all');

  const { data: tasks = [], isPending } = useMyTasks(volunteerId);
  const { data: openTasks = [], isPending: openPending } = useOpenTasks(volunteerId);
  const { data: areas = [] } = useAreas();

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const s = assignmentStatus(task, volunteerId);
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

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('tasks.filter.all') },
    { key: 'pending', label: t('tasks.filter.pending') },
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
            ListEmptyComponent={
              <EmptyState text={isPending ? t('common.loading') : t('home.noTasks')} />
            }
            renderItem={({ item }) => (
              <TaskRow
                task={item}
                area={areaName(item.areaId)}
                status={assignmentStatus(item, volunteerId)}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              />
            )}
          />
        </>
      ) : (
        <FlatList
          data={sortedOpen}
          keyExtractor={(task) => task.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState text={openPending ? t('common.loading') : t('open.empty')} />
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
  onPress,
}: {
  task: Task;
  area: string;
  status?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <AppText variant="h2" style={styles.flex1}>
            {task.title}
          </AppText>
          <StatusTag status={task.status} />
        </View>
        <AppText variant="sub" numberOfLines={1}>
          {area} · {t('tasks.dueDate')}: {task.dueDate}
        </AppText>
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
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex1: { flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  matchBadge: {
    backgroundColor: colors.passedBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
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
