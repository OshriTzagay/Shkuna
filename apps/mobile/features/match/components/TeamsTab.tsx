import { FlatList, View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, EmptyState, PressableScale } from "@/components/ui";
import type { RegWithUser, TeamInMatch } from "../types";
import type { TeamPalette } from "../types";

interface SplitOption {
  numTeams: number;
  label: string;
}

interface Props {
  confirmed: RegWithUser[];
  currentTeams: TeamInMatch[];
  numTeams: number;
  splitOptions: SplitOption[];
  playerRatings: Record<string, number>;
  isAdmin: boolean;
  isActive: boolean;
  isFinished: boolean;
  getName: (uid: string) => string;
  onSetNumTeams: (n: number) => void;
  onShuffle: () => void;
  onStartMatch: () => void;
  onUpdatePlayerRating: (userId: string, rating: number) => void;
}

export function TeamsTab({
  confirmed,
  currentTeams,
  numTeams,
  splitOptions,
  playerRatings,
  isAdmin,
  isActive,
  isFinished,
  getName,
  onSetNumTeams,
  onShuffle,
  onStartMatch,
  onUpdatePlayerRating,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 14 }}>
      {/* ── Shuffle controls (admin only, before match) ── */}
      {isAdmin && !isActive && !isFinished && (
        <Card padding={16}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", textAlign: "right" }}>
            חלוקה לפי דירוג
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 12, textAlign: "right", marginBottom: 12 }}
          >
            מחלק את השחקנים שנרשמו ({confirmed.length}) לקבוצות מאוזנות
          </Text>

          {/* Inline skill-rating editor */}
          {confirmed.length > 0 && (
            <View
              style={{
                marginBottom: 12,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  textAlign: "right",
                  marginBottom: 6,
                  fontWeight: "700",
                }}
              >
                דירוג שחקנים (לפני השרבוט)
              </Text>
              <FlatList
                data={confirmed}
                keyExtractor={(r) => r.user_id}
                scrollEnabled={false}
                renderItem={({ item: r }) => (
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right" }}>
                      {r.user.nickname ?? r.user.full_name}
                    </Text>
                    <View style={{ flexDirection: "row-reverse", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <PressableScale
                          key={star}
                          scaleTo={0.85}
                          onPress={() => onUpdatePlayerRating(r.user_id, star)}
                        >
                          <Ionicons
                            name={star <= (playerRatings[r.user_id] ?? 3) ? "star" : "star-outline"}
                            size={18}
                            color={colors.primary}
                          />
                        </PressableScale>
                      ))}
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Split option chips */}
          {splitOptions.length > 1 && (
            <View
              style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 }}
            >
              {splitOptions.map((opt) => {
                const active = numTeams === opt.numTeams;
                return (
                  <PressableScale key={opt.numTeams} onPress={() => onSetNumTeams(opt.numTeams)}>
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.bgSurface,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.primaryOnText : colors.textPrimary,
                          fontWeight: active ? "800" : "600",
                          fontSize: 12,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

          <Button
            label={confirmed.length < 2 ? "צריך לפחות 2 נרשמים" : "ערבב קבוצות אוטומטית"}
            icon="shuffle"
            onPress={onShuffle}
            disabled={confirmed.length < 2}
          />
        </Card>
      )}

      {/* ── Team cards ── */}
      {currentTeams.length > 0 ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
            {currentTeams.map((team) => (
              <TeamCard key={team.letter} team={team} getName={getName} />
            ))}
          </View>
          {isAdmin && !isActive && !isFinished && (
            <Button
              label="התחל משחק"
              emoji="⚽"
              size="lg"
              onPress={() =>
                Alert.alert("התחל משחק", "לצאת לשחק?", [
                  { text: "ביטול", style: "cancel" },
                  { text: "התחל!", onPress: onStartMatch },
                ])
              }
            />
          )}
        </View>
      ) : (
        <EmptyState
          emoji="🎲"
          title="עדיין לא חולקו קבוצות"
          subtitle={isAdmin ? "בקש שחקנים להירשם ולחץ ערבב" : "המנהל יחלק את הקבוצות בקרוב"}
        />
      )}
    </View>
  );
}

function TeamCard({ team, getName }: { team: TeamInMatch; getName: (uid: string) => string }) {
  return (
    <View
      style={{
        backgroundColor: team.cfg.bg,
        borderColor: team.cfg.border,
        borderWidth: 1.5,
        flex: 1,
        minWidth: "47%",
        borderRadius: 18,
        padding: 14,
      }}
    >
      <Text
        style={{
          color: team.cfg.text,
          fontWeight: "800",
          fontSize: 15,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        קבוצה {team.cfg.name}
      </Text>
      {team.playerIds.map((uid) => (
        <Text
          key={uid}
          style={{ color: team.cfg.text, opacity: 0.85, textAlign: "center", fontSize: 13, paddingVertical: 2 }}
        >
          {getName(uid)}
        </Text>
      ))}
    </View>
  );
}
