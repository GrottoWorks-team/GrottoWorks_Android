// Toast đơn giản cho mobile: provider + hook useToast, hiển thị ở đáy màn hình.
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme/tokens';

type Kind = 'info' | 'alert';
interface ToastValue {
  toast: (message: string, kind?: Kind) => void;
}
const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (msg: string, k: Kind = 'info') => {
      setMessage(msg);
      setKind(k);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setMessage(null),
        );
      }, 2600);
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, kind === 'alert' ? styles.alert : null]}>
            <AppText variant="body" color="#FFFFFF">
              {message}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng trong <ToastProvider>');
  return ctx.toast;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing['5xl'],
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  toast: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '100%',
  },
  alert: { backgroundColor: colors.dangerFg },
});
