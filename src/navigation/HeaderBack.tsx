// Nút "Quay lại" cho header native-stack của tab Nhiệm vụ.
//
// Vì sao cần nút riêng: chi tiết nhiệm vụ (TaskDetail/OpenDetail) có thể được mở từ
// **tab khác** (Trang chủ → `navigate('Tasks', { screen: 'OpenDetail' })`). Khi đó màn
// chi tiết là màn ĐẦU của stack nên native-stack **ẩn nút back mặc định** → người dùng
// không có lối quay lại. Nút này luôn hiển thị: còn màn trước thì `goBack()`, không thì
// đưa về danh sách nhiệm vụ (reset để stack không phình ra).
import { Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '../components/AppText';
import { colors, spacing } from '../theme/tokens';
import type { TasksStackParamList } from './types';

export function HeaderBack() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<TasksStackParamList>>();

  const onPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'TaskList' }] });
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={({ pressed }) => [styles.wrap, pressed ? styles.pressed : null]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.pine} />
      <AppText variant="h2" color={colors.pine}>
        {t('common.back')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
