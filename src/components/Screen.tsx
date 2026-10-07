// Screen — wrapper (SafeArea) + nền gradient dải màu đặc trưng của app: đậm hơn
// ở đầu màn hình rồi nhạt dần xuống dưới về màu canvas. Dùng cho mọi màn hình.
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { colors, screenGradient } from '../theme/tokens';

export function Screen({
  children,
  edges = ['top'],
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {/* Nền gradient: phủ toàn bộ màn hình; dải màu chuyển dần xuống canvas. */}
      <LinearGradient
        colors={screenGradient}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  inner: { flex: 1 },
});
