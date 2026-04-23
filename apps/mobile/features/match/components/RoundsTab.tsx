import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatStopwatch } from "@shkuna/utils";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, PressableScale } from "@/components/ui";
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
  rounds, currentTeams, gameState, matchResult, avgRatings,
  confirmed, elapsed, isActive, isFinished, isAdmin,
  cfgFor, getName, onStopwatch, onRoundResult, onEndMatch, stopwatchRunning,
}: Props) {
  const { colors } = useTheme();
  const [showAllHistory, setShowAllHistory] = useState(false);

  function confirmWin(letter: string) {
    const cfg = cfgFor(letter);
    Alert.alert(
      `🏆 קבוצה ${cfg.name} ניצחה?`,
      "המפסידים יורדים, הקבוצה הבאה עולה",
      [
        { text: "ביטול", style: "cancel" },
        { text: "אישור", onPress: () => onRoundResult(letter) },
      ]
    );
  }

  function confirmDraw() {
    Alert.alert("🤝 תיקו?", "1 נקודה לכל קבוצה", [
      { text: "ביטול", style: "cancel" },
      { text: "אישור", onPress: () => onRoundResult(null) },
    ]);
  }

  const visibleHistory = showAllHistory ? rounds : rounds.slice(-5);

  return (
    <View style={{ gap: 12 }}>

      {/* ── Post-match summary ── */}
      {isFinished && (
        <MatchSummary
          matchResult={matchResult}
          currentTeams={currentTeams}
          avgRatings={avgRatings}
          confirmed={confirmed}
          cfgFor={cfgFor}
          getName={getName}
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

      {/* ── Active court — main action area ── */}
      {isActive && (
        <Card padding={14}>
          {/* Round header */}
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 15 }}>
                מחזור {rounds.length + 1}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>לחץ על הקבוצה שניצחה</Text>
          </View>

          {/* Two playing teams — full-width tap targets */}
          <View style={{ gap: 10 }}>
            {gameState.playing.map((letter, idx) => {
              const cfg = cfgFor(letter);
              const team = currentTeams.find((t) => t.letter === letter);
              return (
                <View key={letter}>
                  <PressableScale onPress={() => confirmWin(letter)} scaleTo={0.97}>
                    <View
                      style={{
                        backgroundColor: cfg.bg,
                        borderColor: cfg.border,
                        borderWidth: 2,
                        borderRadius: 16,
                        padding: 14,
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {/* Color dot */}
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cfg.border }} />
                      {/* Team info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: cfg.text, fontWeight: "800", fontSize: 14 }}>
                          קבוצה {cfg.name}
                        </Text>
                        <Text style={{ color: cfg.text, opacity: 0.75, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {team?.playerIds.map((uid) => getName(uid)).join("  ·  ")}
                        </Text>
                      </View>
                      {/* Win badge */}
                      <View style={{ backgroundColor: cfg.border + "AA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ color: cfg.text, fontWeight: "800", fontSize: 12 }}>🏆 ניצחה</Text>
                      </View>
                    </View>
                  </PressableScale>
                  {/* VS divider */}
                  {idx === 0 && (
                    <View style={{ alignItems: "center", marginVertical: 4 }}>
                      <Text style={{ color: colors.textMuted, fontWeight: "800", fontSize: 12 }}>VS</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Draw button */}
          <View style={{ marginTop: 10 }}>
            <Button label="🤝 תיקו (+1 לכל קבוצה)" variant="secondary" onPress={confirmDraw} />
          </View>

          {/* Waiting queue */}
          {gameState.waiting.length > 0 && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "right", marginBottom: 8, fontWeight: "700" }}>
                תור המתנה
              </Text>
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {gameState.waiting.map((letter, idx) => {
                  const cfg = cfgFor(letter);
                  return (
                    <View
                      key={letter}
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: cfg.bg,
                        borderColor: cfg.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: cfg.text, fontWeight: "700", fontSize: 12 }}>
                        קבוצה {cfg.name}
                      </Text>
                      <View style={{ backgroundColor: cfg.border + "60", borderRadius: 999, width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: cfg.text, fontSize: 10, fontWeight: "800" }}>{idx + 1}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Card>
      )}

      {/* ── Scoreboard ── */}
      {currentTeams.length > 0 && (
        <Card padding={14}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 13, textAlign: "right", marginBottom: 10 }}>
            ניקוד
          </Text>
          {/* Sort by points descending */}
          {[...currentTeams]
            .sort((a, b) => (gameState.points[b.letter] ?? 0) - (gameState.points[a.letter] ?? 0))
            .map((team, idx) => {
              const pts = gameState.points[team.letter] ?? 0;
              const isPlaying = gameState.playing.includes(team.letter);
              const cfg = cfgFor(team.letter);
              const maxPts = Math.max(...Object.values(gameState.points), 1);
              return (
                <View
                  key={team.letter}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 8,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  {/* Rank */}
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700", width: 18, textAlign: "center" }}>
                    {idx + 1}
                  </Text>
                  {/* Color dot + name */}
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.border }} />
                  <Text style={{ color: cfg.text, fontWeight: "700", fontSize: 13, width: 52 }}>
                    {cfg.name}
                  </Text>
                  {/* Progress bar */}
                  <View style={{ flex: 1, height: 6, backgroundColor: colors.bgSurface, borderRadius: 999 }}>
                    <View style={{ height: "100%", width: `${(pts / maxPts) * 100}%`, backgroundColor: cfg.border, borderRadius: 999 }} />
                  </View>
                  {/* Points */}
                  <Text style={{ color: colors.textPrimary, fontWeight: "900", fontSize: 15, width: 28, textAlign: "right" }}>
                    {pts}
                  </Text>
                  {/* Status badge */}
                  <View style={{ width: 56, alignItems: "flex-start" }}>
                    {isPlaying ? (
                      <View style={{ backgroundColor: colors.success + "25", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: colors.success, fontSize: 10, fontWeight: "700" }}>🎮 משחקת</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: colors.bgSurface, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>⏳ ממתינה</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
        </Card>
      )}

      {/* ── Round history ── */}
      {rounds.length > 0 && (
        <Card padding={14}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 13 }}>
              {rounds.length} מחזורים
            </Text>
            {rounds.length > 5 && (
              <PressableScale onPress={() => setShowAllHistory((v) => !v)}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                  {showAllHistory ? "פחות" : `הצג הכל`}
                </Text>
              </PressableScale>
            )}
          </View>
          <View style={{ gap: 0 }}>
            {[...visibleHistory].reverse().map((r, idx) => {
              const winCfg = r.winner ? cfgFor(r.winner) : null;
              const t1cfg = cfgFor(r.team1_letter);
              const t2cfg = cfgFor(r.team2_letter);
              return (
                <View
                  key={String(r.id || r.round_number)}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 11, width: 44, textAlign: "right" }}>
                    #{r.round_number}
                  </Text>
                  <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t1cfg.border }} />
                    <Text style={{ color: colors.textSecondary, fontWeight: "700", fontSize: 12 }}>{t1cfg.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>vs</Text>
                    <Text style={{ color: colors.textSecondary, fontWeight: "700", fontSize: 12 }}>{t2cfg.name}</Text>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t2cfg.border }} />
                  </View>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, minWidth: 70 }}>
                    {winCfg ? (
                      <>
                        <Text style={{ fontSize: 12 }}>🏆</Text>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: winCfg.border }} />
                        <Text style={{ color: winCfg.text, fontWeight: "800", fontSize: 12 }}>{winCfg.name}</Text>
                      </>
                    ) : (
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>🤝 תיקו</Text>
                    )}
                  </View>
                  {r.duration_sec ? (
                    <Text style={{ color: colors.textMuted, fontSize: 11, width: 42, textAlign: "right" }}>
                      {formatStopwatch(r.duration_sec)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* ── End match ── */}
      {isAdmin && isActive && (
        <Button
          label="סיים משחק 🏁"
          variant="danger"
          size="lg"
          onPress={() =>
            Alert.alert("סיום משחק", "לסיים את המשחק?", [
              { text: "ביטול", style: "cancel" },
              { text: "סיים", style: "destructive", onPress: onEndMatch },
            ])
          }
        />
      )}
    </View>
  );
}

// ── MatchSummary ───────────────────────────────────────────────

function MatchSummary({
  matchResult, currentTeams, avgRatings, confirmed, cfgFor, getName,
}: {
  matchResult: MatchResult | null;
  currentTeams: TeamInMatch[];
  avgRatings: Record<string, number>;
  confirmed: RegWithUser[];
  cfgFor: (letter: string) => TeamPalette;
  getName: (uid: string) => string;
}) {
  const { colors } = useTheme();
  const winTeam = matchResult?.winning_team_letter
    ? currentTeams.find((t) => t.letter === matchResult.winning_team_letter)
    : null;

  return (
    <View style={{ gap: 10 }}>
      {/* Winner banner */}
      {winTeam ? (
        <View style={{ backgroundColor: winTeam.cfg.bg, borderColor: winTeam.cfg.border, borderWidth: 2, borderRadius: 20, padding: 18, alignItems: "center", gap: 10 }}>
          <Text style={{ color: winTeam.cfg.text, fontWeight: "900", fontSize: 20 }}>🏆 קבוצה {winTeam.cfg.name} ניצחה!</Text>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
            {winTeam.playerIds.map((uid) => (
              <View key={uid} style={{ backgroundColor: winTeam.cfg.border + "55", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: winTeam.cfg.text, fontWeight: "700", fontSize: 12 }}>{getName(uid)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Card padding={16}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 17, textAlign: "center" }}>🤝 תיקו</Text>
        </Card>
      )}

      {/* MVP / Low */}
      {(matchResult?.mvp_user_id || matchResult?.low_user_id) && (
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          {matchResult.mvp_user_id && (
            <AwardCard emoji="🏅" label="מצטיין" name={getName(matchResult.mvp_user_id)} tone="warning" />
          )}
          {matchResult.low_user_id && (
            <AwardCard emoji="💩" label="שחקן שפל" name={getName(matchResult.low_user_id)} tone="error" />
          )}
        </View>
      )}

      {/* Player ratings */}
      {Object.keys(avgRatings).length > 0 && (
        <Card padding={14}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 13, textAlign: "right", marginBottom: 10 }}>
            דירוגי שחקנים
          </Text>
          {confirmed
            .filter((r) => avgRatings[r.user_id] != null)
            .sort((a, b) => (avgRatings[b.user_id] ?? 0) - (avgRatings[a.user_id] ?? 0))
            .map((r, idx) => {
              const avg = avgRatings[r.user_id]!;
              return (
                <View
                  key={r.user_id}
                  style={{ flexDirection: "row-reverse", alignItems: "center", paddingVertical: 7, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border, gap: 10 }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12, width: 18, textAlign: "center" }}>{idx + 1}</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right", fontSize: 13 }}>
                    {r.user.nickname ?? r.user.full_name}
                  </Text>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name={s <= Math.round(avg) ? "star" : "star-outline"} size={13} color={colors.warning} />
                    ))}
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginRight: 4 }}>{avg}</Text>
                  </View>
                </View>
              );
            })}
        </Card>
      )}
    </View>
  );
}

function AwardCard({ emoji, label, name, tone }: { emoji: string; label: string; name: string; tone: "warning" | "error" }) {
  const { colors } = useTheme();
  const color = tone === "warning" ? colors.warning : colors.error;
  const bg = tone === "warning" ? colors.warningDim : colors.errorDim;
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderColor: color + "55", borderWidth: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
      <Text style={{ color, fontWeight: "800", fontSize: 13, textAlign: "center" }}>{name}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
