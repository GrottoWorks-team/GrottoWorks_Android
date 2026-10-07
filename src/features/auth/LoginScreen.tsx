// Đăng nhập TNV — nền ảnh Giáng sinh + tuyết rơi, chọn tài khoản demo
// hoặc nhập email/mật khẩu.
import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Snowfall } from '../../components/Snowfall';
import { useAuth } from '../../auth/AuthContext';
import { DEMO_EMAILS, DEMO_PASSWORD } from '../../api';
import { colors, radius, spacing } from '../../theme/tokens';

// Ảnh nền mùa Giáng sinh — dùng cùng nguồn với webapp.
const BG_IMAGE =
  'https://cdn2.fptshop.com.vn/unsafe/800x0/Hinh_nen_Power_Point_Giang_sinh_2_f5da9b6b32.jpg';

export function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, signingIn } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAILS[0]);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError(t('login.emailRequired'));
    if (!password) return setError(t('login.passwordRequired'));
    try {
      await signIn(email, password);
    } catch {
      setError(t('login.invalid'));
    }
  };

  return (
    <View style={styles.root}>
      {/* Nền ảnh mùa Giáng sinh + lớp phủ tối để card nổi bật. */}
      <ImageBackground source={{ uri: BG_IMAGE }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(43,45,66,0.30)', 'rgba(43,45,66,0.50)', 'rgba(43,45,66,0.80)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Tuyết rơi: lớp phủ trên nền, dưới card. */}
      <Snowfall count={56} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <AppText variant="display" style={styles.brandTitle}>
              {t('app.name')}
            </AppText>
            <AppText variant="sub" style={styles.brandSub}>
              {t('login.subtitle')}
            </AppText>
          </View>

          <Card>
            <AppText variant="h2" style={styles.cardTitle}>
              {t('login.title')}
            </AppText>
            <AppText variant="sub" style={styles.hint}>
              {t('login.hint')}
            </AppText>

            <AppText variant="label" style={styles.label}>
              {t('login.email')}
            </AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('login.email')}
              placeholderTextColor={colors.faint}
              style={styles.input}
            />

            <AppText variant="label" style={styles.label}>
              {t('login.password')}
            </AppText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('login.password')}
              placeholderTextColor={colors.faint}
              style={styles.input}
            />

            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            <Button
              label={signingIn ? t('login.loggingIn') : t('login.submit')}
              onPress={submit}
              loading={signingIn}
              style={styles.submit}
            />
          </Card>

          <AppText variant="sub" style={styles.demoTitle}>
            {t('login.demoAccounts')}
          </AppText>
          <View style={styles.chips}>
            {DEMO_EMAILS.map((e) => (
              <Pressable key={e} onPress={() => setEmail(e)} style={styles.chip}>
                <AppText variant="mono" color={colors.pine}>
                  {e}
                </AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  flex: { flex: 1 },
  scroll: { padding: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  // Title nổi bật: vàng gold tương phản với nền xanh/tối + bóng để tách khỏi nền.
  brandTitle: {
    color: colors.gold,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandSub: { marginTop: spacing.xs, textAlign: 'center', color: 'rgba(255,255,255,0.85)' },
  cardTitle: { marginBottom: spacing.xs },
  hint: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panel,
    color: colors.ink,
    fontSize: 15,
  },
  error: { color: colors.dangerFg, marginTop: spacing.md, fontWeight: '600' },
  submit: { marginTop: spacing.xl },
  demoTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, textAlign: 'center', color: 'rgba(255,255,255,0.85)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
  },
});
