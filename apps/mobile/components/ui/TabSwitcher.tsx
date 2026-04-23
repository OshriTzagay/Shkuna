import { useEffect, useState } from "react";
import { View, Text, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { PressableScale } from "./PressableScale";

interface TabOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabSwitcherProps {
  value: string;
  options: TabOption[];
  onChange: (id: string) => void;
}

/**
 * Pill-style segmented switcher with a smoothly sliding indicator.
 *
 * RTL strategy: the container uses `flexDirection: "row-reverse"` so
 * the first option renders on the RIGHT (correct for Hebrew). The
 * animated indicator is anchored at `right: padding` and translates
 * in the NEGATIVE-X direction (leftward) as the index increases.
 */
export function TabSwitcher({ value, options, onChange }: TabSwitcherProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const PADDING = 4;
  const tabWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;

  // In RTL (row-reverse), index 0 is rightmost, so index N is to the LEFT.
  // translateX must go NEGATIVE (leftward) as the index grows.
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const offset = useSharedValue(idx);

  useEffect(() => {
    offset.value = withSpring(idx, { damping: 18, stiffness: 220, mass: 0.6 });
  }, [idx, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    // Negative because we're sliding LEFT for higher indices in row-reverse layout
    transform: [{ translateX: -(offset.value * tabWidth) }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={onLayout}
      style={{
        backgroundColor: colors.bgSurface,
        borderRadius: 14,
        padding: PADDING,
        // row-reverse → first option on the RIGHT (RTL)
        flexDirection: "row-reverse",
        borderWidth: 1,
        borderColor: colors.border,
        height: 44,
        position: "relative",
      }}
    >
      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: PADDING,
              // Anchor on the RIGHT for RTL; slides left for higher indices
              right: PADDING,
              width: tabWidth,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.primary,
            },
            indicatorStyle,
          ]}
        />
      )}

      {options.map((opt) => {
        const focused = opt.id === value;
        return (
          <PressableScale
            key={opt.id}
            onPress={() => !opt.disabled && onChange(opt.id)}
            scaleTo={opt.disabled ? 1 : 0.97}
            style={{ flex: 1 }}
          >
            <View
              style={{
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                opacity: opt.disabled ? 0.35 : 1,
              }}
            >
              <Text
                style={{
                  color: focused ? colors.primaryOnText : colors.textSecondary,
                  fontWeight: focused ? "800" : "600",
                  fontSize: 13,
                }}
              >
                {opt.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
