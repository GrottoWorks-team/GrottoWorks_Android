// StatusTag — pill trạng thái, đồng bộ mapping với webapp (StatusTag.tsx).
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../theme/tokens';

type Tone = 'ok' | 'warn' | 'alert' | 'soft';

const TONES: Record<Tone, { bg: string; fg: string; glyph: string }> = {
  ok: { bg: colors.passedBg, fg: colors.passedFg, glyph: '●' },
  warn: { bg: colors.pendingBg, fg: colors.pendingFg, glyph: '◆' },
  alert: { bg: colors.dangerBg, fg: colors.dangerFg, glyph: '▲' },
  soft: { bg: colors.neutralBg, fg: colors.neutralFg, glyph: '◇' },
};

const MAP: Record<string, Tone> = {
  DONE: 'ok', APPROVED: 'ok', RESOLVED: 'ok', ENOUGH: 'ok', CLOSED: 'ok',
  ON_TRACK: 'ok', GOOD: 'ok', ACCEPTED: 'ok',
  TODO: 'warn', DOING: 'warn', OPEN: 'warn', PLANNED: 'warn', PENDING: 'warn',
  INCOMING: 'warn', RECEIVED_PARTIAL: 'warn', PENDING_FIX: 'warn',
  REVIEW: 'warn', DRAFT: 'soft',
  // Trạng thái đơn đăng ký tình nguyện: chờ duyệt dùng tone "warn", đã duyệt "ok".
  REG_PENDING: 'warn',
  LATE: 'alert', REVISE: 'alert', REJECTED: 'alert', SHORTAGE: 'alert',
  AT_RISK: 'alert', DECLINED: 'alert',
};

export function StatusTag({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone = TONES[MAP[status] ?? 'soft'];
  const label = t(`status.${status}`, status);
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.glyph, { color: tone.fg }]}>{tone.glyph}</Text>
      <Text style={[styles.label, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  glyph: { fontSize: 9, marginRight: 4 },
  label: { fontSize: 11, fontWeight: '600' },
});
