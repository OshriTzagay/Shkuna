import { useEffect } from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";

// ─────────────────────────────────────────────────────────────
// PressableScale
// ─────────────────────────────────────────────────────────────
// A press-feedback wrapper powered by Reanimated worklets so the
// scale animation runs entirely on the UI thread.
// ─────────────────────────────────────────────────────────────

interface PressableScaleProps extends PressableProps {
  scaleTo?: number;
  style?: ViewStyle | ViewStyle[];
}

export function PressableScale({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={style as ViewStyle}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320, mass: 0.4 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 240, mass: 0.5 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children as any}</Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// FadeInUp
// ─────────────────────────────────────────────────────────────
// Drop-in container that fades + slides children up on mount.
// Cheap & runs on the UI thread.
// ─────────────────────────────────────────────────────────────

interface FadeInUpProps {
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export function FadeInUp({
  delay = 0,
  distance = 16,
  duration = 420,
  style,
  children,
}: FadeInUpProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, duration, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [
      { translateY: interpolate(t.value, [0, 1], [distance, 0]) },
    ],
  }));

  return <Animated.View style={[animatedStyle, style as ViewStyle]}>{children}</Animated.View>;
}
