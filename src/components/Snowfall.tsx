// Snowfall — lớp phủ tuyết rơi cho màn Login (Golden Winter).
// Tạo N hạt tuyết với vị trí/kích thước/tốc độ ngẫu nhiên (memoized một lần
// để không đổi giữa các re-render), rồi animate bằng Animated (native driver)
// nên chạy mượt và không tốn JS mỗi frame. Tương đương bản CSS của webapp.
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

interface Flake {
  id: number;
  x: number; // vị trí ngang (px)
  size: number; // đường kính (px)
  duration: number; // ms để rơi hết màn hình
  delay: number; // ms trễ trước khi bắt đầu (âm → đã rơi sẵn)
  drift: number; // px trôi ngang khi rơi
  opacity: number;
}

function Flake({ flake, height }: { flake: Flake; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(flake.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: flake.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flake.delay, flake.duration, progress]);

  // translateY đi từ trên màn hình xuống dưới; translateX trôi ngang dần.
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-height * 0.1, height * 1.1],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, flake.drift],
  });
  // Mờ dần ở đầu và cuối hành trình để hạt "tan" mượt.
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, flake.opacity, flake.opacity, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flake,
        {
          left: flake.x,
          width: flake.size,
          height: flake.size,
          borderRadius: flake.size / 2,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

export function Snowfall({ count = 50 }: { count?: number }) {
  const { width, height } = useWindowDimensions();

  const flakes = useMemo<Flake[]>(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        x: Math.random() * width,
        size: 3 + Math.random() * 6,
        duration: 8000 + Math.random() * 12000,
        delay: Math.random() * -20000, // âm → nhiều hạt đã rơi sẵn khi tải trang
        drift: (Math.random() - 0.5) * 120,
        opacity: 0.4 + Math.random() * 0.6,
      })),
    [count, width],
  );

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      {flakes.map((f) => (
        <Flake key={f.id} flake={f} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { overflow: 'hidden' },
  flake: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#FFFFFF',
    // "phát sáng" nhẹ tương đương box-shadow trắng trên web
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
});
