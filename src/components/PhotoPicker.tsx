// PhotoPicker — chọn/chụp ảnh minh chứng cho nhiệm vụ. Hiển thị lưới thumbnail
// kèm nút xoá, cùng 2 nút: chụp ảnh (camera) và chọn từ thư viện.
// Dùng expo-image-picker; xin quyền khi cần và báo lỗi qua Alert.
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/tokens';

const MAX_PHOTOS = 6;

interface PhotoPickerProps {
  /** Danh sách URI ảnh hiện có (đã chọn). */
  photos: string[];
  /** Cập nhật danh sách URI sau khi thêm/xoá. */
  onChange: (photos: string[]) => void;
  /** Hiển thị cảnh báo đỏ khi chưa có ảnh nào (validate submit). */
  error?: boolean;
}

export function PhotoPicker({ photos, onChange, error }: PhotoPickerProps) {
  const { t } = useTranslation();

  const addUris = (uris: string[]) => {
    const merged = [...photos];
    for (const uri of uris) {
      if (merged.length >= MAX_PHOTOS) break;
      if (!merged.includes(uri)) merged.push(uri);
    }
    onChange(merged);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tasks.permissionTitle'), t('tasks.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled) addUris(result.assets.map((a) => a.uri));
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tasks.permissionTitle'), t('tasks.libraryPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) addUris(result.assets.map((a) => a.uri));
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const canAdd = photos.length < MAX_PHOTOS;

  return (
    <View style={styles.wrap}>
      <AppText variant="label">{t('tasks.photoEvidence')}</AppText>
      <AppText variant="sub" style={styles.hint}>
        {t('tasks.photoEvidenceHint')}
      </AppText>

      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tasks.removePhoto')}
                onPress={() => removeAt(i)}
                hitSlop={6}
                style={styles.removeBtn}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <AppText style={styles.errorText}>{t('tasks.photoRequired')}</AppText>
      ) : null}

      {canAdd ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={takePhoto}
            style={({ pressed }) => [styles.sourceBtn, pressed ? styles.pressed : null]}
          >
            <Ionicons name="camera-outline" size={18} color={colors.pine} />
            <AppText variant="sub" color={colors.pine} style={styles.sourceLabel}>
              {t('tasks.takePhoto')}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={pickFromLibrary}
            style={({ pressed }) => [styles.sourceBtn, pressed ? styles.pressed : null]}
          >
            <Ionicons name="images-outline" size={18} color={colors.pine} />
            <AppText variant="sub" color={colors.pine} style={styles.sourceLabel}>
              {t('tasks.fromLibrary')}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Lưới ảnh chỉ để xem (dùng khi hiển thị ảnh đã nộp cho trưởng khu duyệt). */
export function PhotoGallery({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <View style={styles.grid}>
      {photos.map((uri, i) => (
        <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumb} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.dangerFg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderWidth: 1,
    borderColor: colors.pine,
    borderRadius: radius.md,
    backgroundColor: colors.pineLight,
  },
  sourceLabel: { fontWeight: '600' },
  pressed: { opacity: 0.85 },
  errorText: { color: colors.dangerFg, fontWeight: '600' },
});
