// Snowfall — lớp phủ tuyết rơi cho màn Login (Golden Winter).
// Tạo N hạt tuyết với vị trí/kích thước/tốc độ ngẫu nhiên (memoized một lần
// để không đổi giữa các re-render), rồi animate bằng Animated (native driver)
// nên chạy mượt và không tốn JS mỗi frame. Tương đương bản CSS của webapp.
import { useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useAnimatedValue,
  useWindowDimensions,
  View,
} from 'react-native';

interface Snowflake {
  id: number;
  x: number; // vị trí ngang (px)
  size: number; // đường kính (px)
  duration: number; // ms để rơi hết màn hình
  delay: number; // ms trễ trước khi bắt đầu (âm → đã rơi sẵn)
  drift: number; // px trôi ngang khi rơi
  opacity: number;
}

// PRNG tất định (mulberry32): giữ hạt tuyết trông ngẫu nhiên nhưng KHÔNG gọi
// Math.random() trong render (react-hooks/purity) và ổn định giữa các lần render.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function SnowflakeView({ flake, height }: { flake: Snowflake; height: number }) {
  const progress = useAnimatedValue(0);

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

  const flakes = useMemo<Snowflake[]>(() => {
    const rand = seededRandom(0x5eed);
    return Array.from({ length: count }, (_, id) => ({
      id,
      x: rand() * width,
      size: 3 + rand() * 6,
      duration: 8000 + rand() * 12000,
      delay: rand() * -20000, // âm → nhiều hạt đã rơi sẵn khi tải trang
      drift: (rand() - 0.5) * 120,
      opacity: 0.4 + rand() * 0.6,
    }));
  }, [count, width]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      {flakes.map((f) => (
        <SnowflakeView key={f.id} flake={f} height={height} />
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
