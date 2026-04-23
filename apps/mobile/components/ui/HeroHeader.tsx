import { type ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { PitchDecor } from "./Screen";

interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  rightSlot?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  meta?: ReactNode;
}

/**
 * Branded header used at the top of every primary screen.
 * Solid dark surface with subtle pitch-line decoration to
 * keep the brand consistent.
 */
export function HeroHeader({
  title,
  subtitle,
  emoji,
  rightSlot,
  showBack,
  onBack,
  meta,
}: HeroHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        paddingTop: 12,
        paddingBottom: 32,
        paddingHorizontal: 22,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        overflow: "hidden",
      }}
    >
      <PitchDecor />

      {(showBack || rightSlot) && (
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {showBack && (
            <TouchableOpacity
              onPress={onBack ?? (() => router.back())}
              hitSlop={12}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.bgSurface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>{rightSlot}</View>
        </View>
      )}

      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
        {emoji && (
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primaryDim,
              borderWidth: 1,
              borderColor: colors.primaryMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          {subtitle && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                textAlign: "right",
                marginBottom: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 28,
              fontWeight: "800",
              textAlign: "right",
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Text>
        </View>
      </View>

      {meta && <View style={{ marginTop: 14 }}>{meta}</View>}
    </View>
  );
}
