import { useEffect } from "react";
import { View, Text } from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { formatStopwatch } from "@shkuna/utils";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, PressableScale } from "@/components/ui";

interface Props {
  elapsed: number;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function StopwatchWidget({ elapsed, running, onStart, onStop, onReset }: Props) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!running) {
      pulse.value = withTiming(0, { duration: 200 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [running, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.4]) }],
    opacity: interpolate(pulse.value, [0, 1], [1, 0.4]),
  }));

  return (
    <Card padding={18} style={{ alignItems: "center" }}>
      <View
        style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 14 }}
      >
        {running && (
          <ReAnimated.View
            style={[
              { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error },
              dotStyle,
            ]}
          />
        )}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 56,
            fontWeight: "900",
            fontVariant: ["tabular-nums"],
            letterSpacing: 2,
          }}
        >
          {formatStopwatch(elapsed)}
        </Text>
      </View>

      <View style={{ flexDirection: "row-reverse", gap: 10, alignItems: "center" }}>
        <View style={{ minWidth: 140 }}>
          {!running ? (
            <Button label="▶ התחל" onPress={onStart} size="md" />
          ) : (
            <Button label="⏸ עצור" variant="danger" onPress={onStop} size="md" />
          )}
        </View>
        <PressableScale onPress={onReset}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.bgSurface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="refresh" size={20} color={colors.textPrimary} />
          </View>
        </PressableScale>
      </View>
    </Card>
  );
}
