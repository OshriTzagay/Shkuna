import { FlatList, View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatStopwatch } from "@shkuna/utils";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, SectionTitle, PressableScale } from "@/components/ui";
import { StopwatchWidget } from "./StopwatchWidget";
import type { RoundRecord, TeamInMatch, GameState, MatchResult, TeamPalette, RegWithUser } from "../types";

interface Props {
  rounds: RoundRecord[];
  currentTeams: TeamInMatch[];
  gameState: GameState;
  matchResult: MatchResult | null;
  avgRatings: Record<string, number>;
  confirmed: RegWithUser[];
  elapsed: number;
  isActive: boolean;
  isFinished: boolean;
  isAdmin: boolean;
  cfgFor: (letter: string) => TeamPalette;
  getName: (uid: string) => string;
  onStopwatch: (action: "start" | "stop" | "reset") => void;
  onRoundResult: (winner: string | null) => void;
  onEndMatch: () => void;
  stopwatchRunning: boolean;
}

export function RoundsTab({
  rounds,
  currentTeams,
  gameState,
  matchResult,
  avgRatings,
  confirmed,
  elapsed,
  isActive,
  isFinished,
  isAdmin,
  cfgFor,
  getName,
  onStopwatch,
  onRoundResult,
  onEndMatch,
  stopwatchRunning,
}: Props) {
  const { colors } = useTheme();
  const teamLetters = currentTeams.map((t) => t.letter);

  function promptRoundResult(teamLetter: string) {
    const cfg = cfgFor(teamLetter);
    Alert.alert(
      `קבוצה ${cfg.name} ניצחה?`,
      "+3 נקודות לקבוצה המנצחת, הקבוצה המפסידה יורדת",
      [
        { text: "ביטול", style: "cancel" },
        { text: "כן, ניצחה! 🏆", onPress: () => onRoundResult(teamLetter) },
      ]
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {/* ── Match summary (finished) ── */}
      {isFinished && (
        <MatchSummary
          matchResult={matchResult}
          currentTeams={currentTeams}
          avgRatings={avgRatings}
          confirmed={confirmed}
          cfgFor={cfgFor}
          getName={getName}
          colors={colors}
        />
      )}

      {/* ── Stopwatch ── */}
      {isActive && (
        <StopwatchWidget
          elapsed={elapsed}
          running={stopwatchRunning}
          onStart={() => onStopwatch("start")}
          onStop={() => onStopwatch("stop")}
          onReset={() => onStopwatch("reset")}
        />
      )}

      {/* ── Scoreboard ── */}
      <Card padding={14}>
        <SectionTitle title="לוח ניקוד" />
        <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
          {teamLetters.map((letter) => {
            const cfg = cfgFor(letter);
            const pts = gameState.points[letter] ?? 0;
            const isPlaying = gameState.playing.includes(letter);
            return (
              <View
                key={letter}
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: cfg.border,
                  borderWidth: isPlaying ? 2 : 1,
                  borderRadius: 14,
                  padding: 12,
                  flex: 1,
                  minWidth: "30%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: cfg.text, fontWeight: "700", fontSize: 12 }}>
                  קבוצה {cfg.name}
                </Text>
                <Text style={{ color: cfg.text, fontWeight: "900", fontSize: 26, marginVertical: 4 }}>
                  {pts}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                  {isPlaying ? "🎮 משחקת" : "⏳ ממתינה"}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* ── Active court ── */}
      {isActive && (
        <ActiveCourt
          gameState={gameState}
          currentTeams={currentTeams}
          rounds={rounds}
          cfgFor={cfgFor}
          getName={getName}
          colors={colors}
          onWin={promptRoundResult}
          onDraw={() =>
            Alert.alert("תיקו", "1 נקודה לכל קבוצה", [
              { text: "ביטול", style: "cancel" },
              { text: "אישור תיקו", onPress: () => onRoundResult(null) },
            ])
          }
        />
      )}

      {/* ── Round history ── */}
      {rounds.length > 0 && (
        <Card padding={14}>
          <SectionTitle title="היסטוריית מחזורים" />
          <FlatList
            data={[...rounds].reverse()}
            keyExtractor={(r) => String(r.id || r.round_number)}
            scrollEnabled={false}
            renderItem={({ item: r }) => {
              const winCfg = r.winner ? cfgFor(r.winner) : null;
              const t1cfg = cfgFor(r.team1_letter);
              const t2cfg = cfgFor(r.team2_letter);
              return (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 11, width: 56, textAlign: "right" }}>
                    מחזור {r.round_number}
                  </Text>
                  <View
                    style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4 }}
                  >
                    <Text style={{ color: t1cfg.text, fontWeight: "700", fontSize: 12 }}>{t1cfg.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>vs</Text>
                    <Text style={{ color: t2cfg.text, fontWeight: "700", fontSize: 12 }}>{t2cfg.name}</Text>
                  </View>
                  <Text style={{ color: winCfg?.text ?? colors.textMuted, fontWeight: "800", fontSize: 12, minWidth: 60, textAlign: "right" }}>
                    {r.winner ? `🏆 ${winCfg?.name}` : "🤝 תיקו"}
                  </Text>
                  {r.duration_sec ? (
                    <Text style={{ color: colors.textMuted, fontSize: 11, width: 48, textAlign: "right" }}>
                      {formatStopwatch(r.duration_sec)}
                    </Text>
                  ) : null}
                </View>
              );
            }}
          />
        </Card>
      )}

      {/* ── End match ── */}
      {isAdmin && isActive && (
        <Button label="🏁 סיים משחק" variant="danger" size="lg" onPress={onEndMatch} />
      )}
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function MatchSummary({
  matchResult, currentTeams, avgRatings, confirmed, cfgFor, getName, colors,
}: {
  matchResult: MatchResult | null;
  currentTeams: TeamInMatch[];
  avgRatings: Record<string, number>;
  confirmed: RegWithUser[];
  cfgFor: (letter: string) => TeamPalette;
  getName: (uid: string) => string;
  colors: any;
}) {
  const winTeam = matchResult?.winning_team_letter
    ? currentTeams.find((t) => t.letter === matchResult.winning_team_letter)
    : null;

  return (
    <View style={{ gap: 12 }}>
      {winTeam ? (
        <View
          style={{
            backgroundColor: winTeam.cfg.bg,
            borderColor: winTeam.cfg.border,
            borderWidth: 2,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <Text
            style={{ color: winTeam.cfg.text, fontWeight: "900", fontSize: 18, textAlign: "center", marginBottom: 8 }}
          >
            🏆 קבוצה {winTeam.cfg.name} ניצחה!
          </Text>
          <View style={{ flexDirection: "row-reverse", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
            {winTeam.playerIds.map((uid) => (
              <View
                key={uid}
                style={{ backgroundColor: winTeam.cfg.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}
              >
                <Text style={{ color: winTeam.cfg.text, fontWeight: "700", fontSize: 12 }}>
                  {getName(uid)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Card variant="surface" padding={16}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 17, textAlign: "center" }}>
            🤝 תיקו
          </Text>
        </Card>
      )}

      <View style={{ flexDirection: "row-reverse", gap: 10 }}>
        {matchResult?.mvp_user_id && (
          <AwardCard
            emoji="🏅"
            color={colors.warning}
            dimColor={colors.warningDim}
            borderColor={colors.warning + "55"}
            label="מצטיין"
            name={getName(matchResult.mvp_user_id)}
          />
        )}
        {matchResult?.low_user_id && (
          <AwardCard
            emoji="💩"
            color={colors.error}
            dimColor={colors.errorDim}
            borderColor={colors.error + "55"}
            label="שחקן שפל"
            name={getName(matchResult.low_user_id)}
          />
        )}
      </View>

      {Object.keys(avgRatings).length > 0 && (
        <Card padding={14}>
          <SectionTitle title="דירוגי שחקנים" />
          <FlatList
            data={confirmed.filter((r) => avgRatings[r.user_id] != null)}
            keyExtractor={(r) => r.user_id}
            scrollEnabled={false}
            renderItem={({ item: r }) => {
              const avg = avgRatings[r.user_id]!;
              return (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 6,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right", fontSize: 13 }}>
                    {r.user.nickname ?? r.user.full_name}
                  </Text>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= Math.round(avg) ? "star" : "star-outline"}
                        size={13}
                        color={colors.warning}
                      />
                    ))}
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginRight: 6 }}>{avg}</Text>
                  </View>
                </View>
              );
            }}
          />
        </Card>
      )}
    </View>
  );
}

function AwardCard({
  emoji, color, dimColor, borderColor, label, name,
}: {
  emoji: string; color: string; dimColor: string; borderColor: string; label: string; name: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: dimColor,
        borderColor,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</Text>
      <Text style={{ color, fontWeight: "800", fontSize: 13, textAlign: "center" }}>{name}</Text>
      <Text style={{ color: "#94A8C4", fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function ActiveCourt({
  gameState, currentTeams, rounds, cfgFor, getName, colors, onWin, onDraw,
}: {
  gameState: GameState;
  currentTeams: TeamInMatch[];
  rounds: RoundRecord[];
  cfgFor: (letter: string) => TeamPalette;
  getName: (uid: string) => string;
  colors: any;
  onWin: (letter: string) => void;
  onDraw: () => void;
}) {
  return (
    <Card padding={14}>
      <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginBottom: 10 }}>
        מחזור {rounds.length + 1} — לחץ על הקבוצה שניצחה
      </Text>
      <View style={{ flexDirection: "row-reverse", gap: 10 }}>
        {gameState.playing.map((letter) => {
          const cfg = cfgFor(letter);
          const team = currentTeams.find((t) => t.letter === letter);
          return (
            <PressableScale key={letter} onPress={() => onWin(letter)} style={{ flex: 1 }}>
              <View
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: cfg.border,
                  borderWidth: 2,
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <Text
                  style={{ color: cfg.text, fontWeight: "800", fontSize: 14, textAlign: "center", marginBottom: 6 }}
                >
                  קבוצה {cfg.name}
                </Text>
                {team?.playerIds.map((uid) => (
                  <Text
                    key={uid}
                    style={{ color: cfg.text, opacity: 0.85, textAlign: "center", fontSize: 11, paddingVertical: 1 }}
                  >
                    {getName(uid)}
                  </Text>
                ))}
                <View
                  style={{ marginTop: 10, backgroundColor: cfg.border, borderRadius: 10, paddingVertical: 6 }}
                >
                  <Text style={{ color: cfg.text, textAlign: "center", fontWeight: "800", fontSize: 12 }}>
                    🏆 ניצחה!
                  </Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ marginTop: 12 }}>
        <Button label="🤝 תיקו (+1 לכל קבוצה)" variant="secondary" onPress={onDraw} />
      </View>

      {gameState.waiting.length > 0 && (
        <View
          style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginBottom: 8 }}>
            ממתינות לשחק
          </Text>
          <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 8 }}>
            {gameState.waiting.map((letter) => {
              const cfg = cfgFor(letter);
              return (
                <View
                  key={letter}
                  style={{
                    backgroundColor: cfg.bg,
                    borderColor: cfg.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: cfg.text, fontWeight: "700", fontSize: 12 }}>
                    קבוצה {cfg.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Card>
  );
}
