import { View, Text, type ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface AvatarProps {
  name: string;
  size?: number;
  tone?: "primary" | "neutral";
  style?: ViewStyle;
}

export function Avatar({ name, size = 40, tone = "primary", style }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();

  const bg = tone === "primary" ? colors.primaryDim : colors.bgSurface;
  const fg = tone === "primary" ? colors.primary : colors.textPrimary;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: tone === "primary" ? colors.primaryMuted : colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: "800", fontSize: size * 0.42 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  tone?: "primary" | "warning" | "error" | "info" | "neutral" | "success";
  style?: ViewStyle;
}

export function Badge({ label, tone = "primary", style }: BadgeProps) {
  const { colors } = useTheme();
  const map = {
    primary: { bg: colors.primaryDim, fg: colors.primary, border: colors.primaryMuted },
    warning: { bg: colors.warningDim, fg: colors.warning, border: colors.warning + "55" },
    error:   { bg: colors.errorDim,   fg: colors.error,   border: colors.error + "55" },
    info:    { bg: colors.infoDim,    fg: colors.info,    border: colors.info + "55" },
    neutral: { bg: colors.bgSurface,  fg: colors.textSecondary, border: colors.border },
    success: { bg: colors.successDim, fg: colors.success, border: colors.success + "55" },
  } as const;
  const c = map[tone];

  return (
    <View
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

interface StatTileProps {
  value: string | number;
  label: string;
  tone?: "primary" | "warning" | "info" | "neutral";
  emoji?: string;
}

export function StatTile({ value, label, tone = "primary", emoji }: StatTileProps) {
  const { colors } = useTheme();
  const map = {
    primary: colors.primary,
    warning: colors.warning,
    info:    colors.info,
    neutral: colors.textSecondary,
  } as const;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgSurface,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
      }}
    >
      {emoji && <Text style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</Text>}
      <Text style={{ color: map[tone], fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
