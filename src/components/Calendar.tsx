// Calendar tháng tự render (không dùng thư viện ngoài) — lưới 7 cột T2..CN.
// Mỗi ngày có thể hiển thị 1 chấm giờ công (xanh) và 1 chấm việc đến hạn (cam).
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/tokens';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export interface DayMarks {
  hasHours: boolean;
  hasTask: boolean;
}

interface Props {
  /** Tháng đang xem — dùng 0-based month như Date. */
  year: number;
  month: number;
  /** Ngày đang chọn (ISO YYYY-MM-DD). */
  selected: string;
  /** Đánh dấu theo ngày (key = ISO YYYY-MM-DD). */
  marks: Record<string, DayMarks>;
  onSelect: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
};

export function Calendar({
  year,
  month,
  selected,
  marks,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const { t } = useTranslation();
  const today = todayIso();

  // Ô đầu tiên được đặt theo thứ 2 → dịch chuyển theo getDay() (0=CN).
  const firstDay = new Date(year, month, 1).getDay(); // 0..6
  const lead = (firstDay + 6) % 7; // số ô trống trước ngày 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Bù cho đủ số hàng nguyên.
  while (cells.length % 7 !== 0) cells.push(null);

  // Chia thành từng hàng 7 ô — mỗi hàng là 1 flex row, mỗi ô flex:1.
  // Tránh dùng width phần trăm (100/7) vì làm tròn sub-pixel khiến ô thứ 7 (CN)
  // bị đẩy xuống hàng riêng, làm trống cả cột Chủ nhật.
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.monthBar}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <AppText variant="h1" color={colors.pine}>
            ‹
          </AppText>
        </Pressable>
        <AppText variant="h2">
          {t(`calendar.month.${month + 1}`)} {year}
        </AppText>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={8}>
          <AppText variant="h1" color={colors.pine}>
            ›
          </AppText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.cell}>
            <AppText variant="label" style={styles.weekday}>
              {t(`calendar.weekday.${w}`)}
            </AppText>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={`w${wi}`} style={styles.grid}>
          {week.map((day, i) => {
            if (day === null) return <View key={`e${wi}-${i}`} style={styles.cell} />;
            const key = iso(year, month, day);
            const mark = marks[key];
            const isSelected = key === selected;
            const isToday = key === today;
            return (
              <Pressable key={key} style={styles.cell} onPress={() => onSelect(key)}>
                <View
                  style={[
                    styles.dayBox,
                    isToday ? styles.dayToday : null,
                    isSelected ? styles.daySelected : null,
                  ]}
                >
                  <AppText
                    variant="sub"
                    color={isSelected ? '#FFFFFF' : colors.ink}
                    style={styles.dayNum}
                  >
                    {day}
                  </AppText>
                  <View style={styles.dots}>
                    {mark?.hasHours ? <View style={[styles.dot, styles.dotHours]} /> : null}
                    {mark?.hasTask ? <View style={[styles.dot, styles.dotTask]} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotHours]} />
          <AppText variant="sub">{t('calendar.legendHours')}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotTask]} />
          <AppText variant="sub">{t('calendar.legendTask')}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  weekRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row' },
  cell: { flex: 1, padding: 2, alignItems: 'center' },
  weekday: { textAlign: 'center' },
  dayBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayToday: { borderWidth: 1, borderColor: colors.pine },
  daySelected: { backgroundColor: colors.pine },
  dayNum: { fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotHours: { backgroundColor: colors.pine },
  dotTask: { backgroundColor: colors.warm },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
