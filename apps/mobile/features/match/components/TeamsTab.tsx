import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, EmptyState, PressableScale } from "@/components/ui";
import type { RegWithUser, TeamInMatch } from "../types";

interface SplitOption { numTeams: number; label: string }

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
  const [showRatings, setShowRatings] = useState(false);
  const canShuffle = confirmed.length >= 2;

  return (
    <View style={{ gap: 12 }}>

      {/* ── Admin controls ── */}
      {isAdmin && !isActive && !isFinished && (
        <Card padding={14}>
          {/* num-teams chips */}
          {splitOptions.length > 1 && (
            <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 12 }}>
              {splitOptions.map((opt) => {
                const active = numTeams === opt.numTeams;
                return (
                  <PressableScale key={opt.numTeams} onPress={() => onSetNumTeams(opt.numTeams)}>
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.bgSurface,
                      }}
                    >
                      <Text style={{ color: active ? colors.primaryOnText : colors.textPrimary, fontWeight: "700", fontSize: 13 }}>
                        {opt.label}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

          <Button
            label={canShuffle ? "ערבב קבוצות 🎲" : "צריך לפחות 2 נרשמים"}
            onPress={onShuffle}
            disabled={!canShuffle}
            size="lg"
          />

          {/* collapsible ratings editor */}
          {canShuffle && (
            <>
              <PressableScale onPress={() => setShowRatings((v) => !v)}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
                  <Ionicons
                    name={showRatings ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>
                    {showRatings ? "הסתר דירוגי שחקנים" : "ערוך דירוגי שחקנים"}
                  </Text>
                </View>
              </PressableScale>

              {showRatings && (
                <View style={{ marginTop: 12, gap: 4 }}>
                  {confirmed.map((r) => (
                    <View
                      key={r.user_id}
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        paddingVertical: 7,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        gap: 10,
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right", fontSize: 13 }}>
                        {r.user.nickname ?? r.user.full_name}
                      </Text>
                      <View style={{ flexDirection: "row-reverse", gap: 3 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <PressableScale key={star} scaleTo={0.85} onPress={() => onUpdatePlayerRating(r.user_id, star)}>
                            <Ionicons
                              name={star <= (playerRatings[r.user_id] ?? 3) ? "star" : "star-outline"}
                              size={17}
                              color={colors.primary}
                            />
                          </PressableScale>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Team cards ── */}
      {currentTeams.length > 0 ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
            {currentTeams.map((team) => (
              <TeamCard key={team.letter} team={team} getName={getName} />
            ))}
          </View>
          {isAdmin && !isActive && !isFinished && (
            <Button
              label="התחל משחק ⚽"
              size="lg"
              onPress={() =>
                Alert.alert("התחל משחק", "יאללה לשחק?", [
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
          title="קבוצות עוד לא חולקו"
          subtitle={isAdmin ? "לחץ ערבב כדי לחלק אוטומטית" : "המנהל יחלק את הקבוצות בקרוב"}
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
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: team.cfg.border }} />
        <Text style={{ color: team.cfg.text, fontWeight: "800", fontSize: 14 }}>
          {team.cfg.name}
        </Text>
      </View>
      {team.playerIds.map((uid) => (
        <Text
          key={uid}
          style={{ color: team.cfg.text, opacity: 0.85, textAlign: "center", fontSize: 13 }}
        >
          {getName(uid)}
        </Text>
      ))}
    </View>
  );
}
