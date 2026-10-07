// Avatar — vòng tròn với chữ cái đầu tên, nền màu sinh từ `avatarHue`.
// Không cần ảnh: màu (HSL) tất định từ hue của user để mỗi người một màu riêng.
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { radius } from '../theme/tokens';

interface Props {
  name: string;
  hue: number;
  size?: number;
}

// Lấy tối đa 2 chữ cái đầu của các từ trong tên.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, hue, size = 64 }: Props) {
  const bg = `hsl(${hue}, 55%, 45%)`;
  const fg = `hsl(${hue}, 60%, 22%)`;
  const ring = `hsl(${hue}, 60%, 88%)`;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: ring,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          { width: size - 6, height: size - 6, borderRadius: radius.pill, backgroundColor: bg },
        ]}
      >
        <AppText
          color="#FFFFFF"
          style={{ fontSize: size * 0.36, fontWeight: '800' }}
        >
          {initials(name)}
        </AppText>
      </View>
      <View style={[styles.dot, { backgroundColor: fg }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
  // Chấm nhỏ ở góc để thêm điểm nhấn màu đậm cùng tông (không bắt buộc nhưng tạo nhận diện).
  dot: { position: 'absolute', right: 2, bottom: 2, width: 10, height: 10, borderRadius: 5 },
});
