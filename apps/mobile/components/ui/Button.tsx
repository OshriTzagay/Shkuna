import { ActivityIndicator, Text, View, type ViewStyle, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { radius, shadow } from "@/constants/colors";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  emoji?: string;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  iconRight,
  emoji,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const sizing: Record<Size, { h: number; px: number; fs: number; iconSize: number; radius: number }> = {
    sm: { h: 40, px: 14, fs: 14, iconSize: 16, radius: radius.md },
    md: { h: 50, px: 18, fs: 16, iconSize: 18, radius: radius.lg },
    lg: { h: 56, px: 20, fs: 17, iconSize: 20, radius: radius.lg },
  };
  const s = sizing[size];

  const palette: Record<Variant, { bg: string; fg: string; border?: string; shadow?: ViewStyle }> = {
    primary: {
      bg: colors.primary,
      fg: colors.primaryOnText,
      shadow: { ...shadow.button, shadowColor: colors.primary },
    },
    secondary: {
      bg: colors.bgSurface,
      fg: colors.textPrimary,
      border: colors.border,
    },
    ghost: {
      bg: "transparent",
      fg: colors.primary,
    },
    danger: {
      bg: colors.error,
      fg: "#FFFFFF",
    },
    success: {
      bg: colors.success,
      fg: colors.primaryOnText,
    },
    outline: {
      bg: "transparent",
      fg: colors.primary,
      border: colors.primary,
    },
  };
  const p = palette[variant];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    height: s.h,
    paddingHorizontal: s.px,
    borderRadius: s.radius,
    backgroundColor: p.bg,
    borderWidth: p.border ? 1.5 : 0,
    borderColor: p.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: fullWidth ? "stretch" : "flex-start",
    opacity: isDisabled ? 0.55 : 1,
    ...(p.shadow ?? {}),
  };

  const textStyle: TextStyle = {
    color: p.fg,
    fontSize: s.fs,
    fontWeight: "800",
  };

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      onPressIn={isDisabled ? undefined : () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      scaleTo={isDisabled ? 1 : 0.97}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Ionicons name={icon} size={s.iconSize} color={p.fg} />}
          {emoji && <Text style={{ fontSize: s.fs }}>{emoji}</Text>}
          <Text style={textStyle}>{label}</Text>
          {iconRight && <Ionicons name={iconRight} size={s.iconSize} color={p.fg} />}
        </View>
      )}
    </PressableScale>
  );
}
