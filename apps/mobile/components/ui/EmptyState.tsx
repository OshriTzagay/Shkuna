import { type ReactNode } from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "./Card";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji = "✨", title, subtitle, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <Card variant="default" padding={28} style={{ alignItems: "center" }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: colors.primaryDim,
          borderWidth: 1,
          borderColor: colors.primaryMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 36 }}>{emoji}</Text>
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 17,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: subtitle ? 4 : 0,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
      {action && <View style={{ marginTop: 18, alignSelf: "stretch" }}>{action}</View>}
    </Card>
  );
}

export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 15,
          fontWeight: "800",
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return (
    <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6 }} />
  );
}
