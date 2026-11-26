// Hồ sơ TNV — CHẾ ĐỘ CHỈNH SỬA (mở từ ProfileViewScreen).
// Sửa tên/SĐT/giới thiệu (PATCH /users/me), kỹ năng theo danh mục BE
// (PUT /users/me/skills) và lịch rảnh dạng khoảng thời gian
// (PUT /users/me/availability).
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../auth/AuthContext';
import { useCommunities, useSkills, useUpdateProfile } from '../../../api/hooks';
import { ApiError } from '../../../api';
import { SKILL_LEVELS } from '../../../types';
import type { AvailabilitySlot, SkillLevelName } from '../../../types';
import { colors, radius, spacing } from '../../../theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : '');
/** Ngày (yyyy-mm-dd) → mốc UTC đầu/cuối ngày để gửi BE. */
const dayStart = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const dayEnd = (date: string) => new Date(`${date}T23:59:00`).toISOString();
const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function ProfileEditScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const volunteerId = user?.id ?? '';
  const update = useUpdateProfile(volunteerId);
  const { data: catalog = [] } = useSkills();
  const { data: communities = [] } = useCommunities();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [introduction, setIntroduction] = useState(user?.introduction ?? '');
  const [communityId, setCommunityId] = useState(user?.communityId ?? '');
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  // 26/11/2026: cấp bậc từng kỹ năng — BE lưu skill_level; thiếu thì BE tính là BASIC.
  const [levels, setLevels] = useState<Record<string, SkillLevelName>>(user?.skillLevels ?? {});
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(user?.availability ?? []);
  const [nameError, setNameError] = useState(false);

  if (!user) return null;

  const toggleSkill = (skillName: string) =>
    setSkills((prev) => {
      if (prev.includes(skillName)) return prev.filter((x) => x !== skillName);
      // Mặc định BASIC cho kỹ năng mới chọn (đồng bộ với mặc định của BE).
      setLevels((current) => (current[skillName] ? current : { ...current, [skillName]: 'BASIC' }));
      return [...prev, skillName];
    });

  const setLevel = (skillName: string, level: SkillLevelName) =>
    setLevels((prev) => ({ ...prev, [skillName]: level }));

  const updateSlot = (index: number, patch: Partial<AvailabilitySlot>) =>
    setAvailability((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  const addSlot = () => {
    const date = todayInput();
    setAvailability((prev) => [
      ...prev,
      { availableFrom: dayStart(date), availableTo: dayEnd(date) },
    ]);
  };

  const removeSlot = (index: number) =>
    setAvailability((prev) => prev.filter((_, i) => i !== index));

  // BE yêu cầu availableTo > availableFrom → chặn trước khi gọi API.
  const invalidSlot = availability.find(
    (slot) => new Date(slot.availableTo).getTime() <= new Date(slot.availableFrom).getTime(),
  );

  const save = async () => {
    if (!name.trim()) return setNameError(true);
    if (invalidSlot) {
      toast(t('profile.slotInvalid'), 'alert');
      return;
    }
    try {
      const picked = catalog.filter((s) => skills.includes(s.name));
      const skillIds = picked.map((s) => s.id);
      // Gửi kèm cấp bậc (nếu danh mục kỹ năng có dữ liệu) để BE không lưu level null.
      const declaredSkills = picked.map((s) => ({
        skillId: s.id,
        skillLevel: levels[s.name] ?? 'BASIC',
      }));
      const updated = await update.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        introduction: introduction.trim(),
        ...(communityId ? { communityId } : {}),
        // Chỉ gửi khi danh mục kỹ năng có dữ liệu, tránh xoá trắng kỹ năng trên BE.
        ...(catalog.length > 0 ? { declaredSkills, skillIds } : {}),
        skills,
        skillLevels: Object.fromEntries(
          skills.map((name) => [name, levels[name] ?? ('BASIC' as SkillLevelName)]),
        ),
        availability,
      });
      setUser({ ...user, ...updated });
      toast(t('profile.saved'));
      navigation.goBack();
    } catch (err) {
      // BE yêu cầu phải có cộng đoàn trước khi lưu thông tin chi tiết TNV.
      const code =
        err instanceof ApiError && err.body && typeof err.body === 'object'
          ? (err.body as { code?: string }).code
          : undefined;
      toast(
        code === 'PROFILE_COMMUNITY_REQUIRED'
          ? t('profile.communityRequired')
          : t('common.error'),
        'alert',
      );
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={t('profile.edit')} sub={t('profile.editHint')} />

        <Card style={[styles.card, styles.idCard]}>
          <Avatar name={name || user.name} hue={user.avatarHue} size={64} />
          <AppText variant="sub" style={styles.center}>
            {user.email}
          </AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.name')}</AppText>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setNameError(false);
            }}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
          {nameError ? <AppText style={styles.errorText}>{t('common.required')}</AppText> : null}

          <AppText variant="label">{t('profile.phone')}</AppText>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('profile.phonePlaceholder')}
            placeholderTextColor={colors.faint}
            style={styles.input}
          />

          <AppText variant="label">{t('profile.introduction')}</AppText>
          <TextInput
            value={introduction}
            onChangeText={setIntroduction}
            multiline
            placeholder={t('profile.introductionPlaceholder')}
            placeholderTextColor={colors.faint}
            style={[styles.input, styles.textarea]}
          />
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.community')}</AppText>
          <AppText variant="sub">{t('profile.communityHint')}</AppText>
          <View style={styles.chips}>
            {communities.length === 0 ? (
              <AppText variant="sub">{t('profile.noCommunities')}</AppText>
            ) : (
              communities.map((c) => {
                const on = c.id === communityId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCommunityId(on ? '' : c.id)}
                    style={[styles.chip, on ? styles.chipOn : null]}
                  >
                    <AppText variant="sub" color={on ? '#FFFFFF' : colors.ink}>
                      {c.name}
                    </AppText>
                  </Pressable>
                );
              })
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.skills')}</AppText>
          <AppText variant="sub">{t('profile.skillsHint')}</AppText>
          <View style={styles.chips}>
            {catalog.map((s) => {
              const on = skills.includes(s.name);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSkill(s.name)}
                  style={[styles.chip, on ? styles.chipOn : null]}
                >
                  <AppText variant="sub" color={on ? '#FFFFFF' : colors.ink}>
                    {s.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {skills.length > 0 ? (
            <AppText variant="sub">{t('profile.skillLevelHint')}</AppText>
          ) : null}
          {skills.map((skillName) => (
            <View key={`level-${skillName}`} style={styles.levelRow}>
              <AppText variant="sub" style={styles.levelName}>
                {skillName}
              </AppText>
              <View style={styles.levelChips}>
                {SKILL_LEVELS.map((level) => {
                  const active = (levels[skillName] ?? 'BASIC') === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => setLevel(skillName, level)}
                      style={[styles.chip, styles.levelChip, active ? styles.chipOn : null]}
                    >
                      <AppText variant="sub" color={active ? '#FFFFFF' : colors.ink}>
                        {t(`skillLevel.${level}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <AppText variant="label">{t('profile.availability')}</AppText>
          <AppText variant="sub">{t('profile.availabilityHint')}</AppText>
          {availability.map((slot, index) => (
            <View key={`slot-${index}`} style={styles.slot}>
              <View style={styles.slotRow}>
                <View style={styles.flex1}>
                  <AppText variant="sub">{t('profile.slotFrom')}</AppText>
                  <TextInput
                    value={toDateInput(slot.availableFrom)}
                    onChangeText={(v) => updateSlot(index, { availableFrom: dayStart(v) })}
                    placeholder="2026-11-06"
                    placeholderTextColor={colors.faint}
                    style={styles.input}
                  />
                </View>
                <View style={styles.flex1}>
                  <AppText variant="sub">{t('profile.slotTo')}</AppText>
                  <TextInput
                    value={toDateInput(slot.availableTo)}
                    onChangeText={(v) => updateSlot(index, { availableTo: dayEnd(v) })}
                    placeholder="2026-11-06"
                    placeholderTextColor={colors.faint}
                    style={styles.input}
                  />
                </View>
              </View>
              <TextInput
                value={slot.note ?? ''}
                onChangeText={(v) => updateSlot(index, { note: v })}
                placeholder={t('profile.slotNote')}
                placeholderTextColor={colors.faint}
                style={styles.input}
              />
              <Button
                size="sm"
                variant="outline"
                label={t('profile.slotRemove')}
                onPress={() => removeSlot(index)}
              />
            </View>
          ))}
          <Button size="sm" variant="outline" label={t('profile.slotAdd')} onPress={addSlot} />
        </Card>

        <Button label={t('common.save')} onPress={save} loading={update.isPending} />
        <Button label={t('common.cancel')} variant="outline" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  idCard: { alignItems: 'center', gap: spacing.xs },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.panel,
  },
  chipOn: { backgroundColor: colors.pine, borderColor: colors.pine },
  levelRow: { marginTop: spacing.sm, gap: 6 },
  levelName: { fontWeight: '600' },
  levelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  levelChip: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.panel,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  slot: { gap: spacing.sm, marginTop: spacing.sm },
  slotRow: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  errorText: { color: colors.dangerFg, fontWeight: '600' },
});
