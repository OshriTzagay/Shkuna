import { View, Text, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Avatar, PressableScale } from "@/components/ui";
import type { MemberWithUser } from "../hooks/useTeamData";
import type { UserRole } from "@shkuna/db";

interface Props {
  member: MemberWithUser;
  isJerseyHolder: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSelf: boolean;
  onUpdateSkillRating: (userId: string, rating: number) => void;
  onUpdateRole: (userId: string, role: UserRole) => void;
}

export function MemberRow({
  member,
  isJerseyHolder,
  isAdmin,
  isManager,
  isSelf,
  onUpdateSkillRating,
  onUpdateRole,
}: Props) {
  const { colors } = useTheme();

  const roleLabel =
    member.role === "manager"
      ? "מנהל"
      : member.role === "assistant"
      ? "עוזר מנהל"
      : "שחקן";

  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
      }}
    >
      <Avatar name={member.user.full_name} size={42} />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>
            {member.user.nickname ?? member.user.full_name}
          </Text>
          {isJerseyHolder && <Text style={{ fontSize: 14 }}>👕</Text>}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "right", marginTop: 2 }}>
          {roleLabel}
          {member.user.nickname ? `  ·  ${member.user.full_name}` : ""}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={{ flexDirection: "row-reverse", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <PressableScale
              key={star}
              onPress={() => isAdmin && onUpdateSkillRating(member.user_id, star)}
              scaleTo={isAdmin ? 0.85 : 1}
            >
              <Ionicons
                name={star <= member.skill_rating ? "star" : "star-outline"}
                size={14}
                color={colors.primary}
              />
            </PressableScale>
          ))}
        </View>

        {isManager && !isSelf && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "שנה תפקיד",
                member.user.nickname ?? member.user.full_name,
                [
                  { text: "שחקן",       onPress: () => onUpdateRole(member.user_id, "player") },
                  { text: "עוזר מנהל",  onPress: () => onUpdateRole(member.user_id, "assistant") },
                  { text: "ביטול",      style: "cancel" },
                ]
              )
            }
          >
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>שנה תפקיד</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
