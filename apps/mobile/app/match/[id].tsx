import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "@/hooks/useTheme";
import { Screen, HeroHeader, Badge, FadeInUp, TabSwitcher } from "@/components/ui";
import { formatMatchDate } from "@shkuna/utils";
import EndMatchSheet from "@/components/match/EndMatchSheet";

import { useMatchData } from "@/features/match/hooks/useMatchData";
import { useStopwatch } from "@/features/match/hooks/useStopwatch";
import { useCfgFor, computeGameState } from "@/features/match/hooks/useTeamPalette";
import { RegistrationTab } from "@/features/match/components/RegistrationTab";
import { TeamsTab } from "@/features/match/components/TeamsTab";
import { RoundsTab } from "@/features/match/components/RoundsTab";
import type { MatchTabId } from "@/features/match/types";

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const cfgFor = useCfgFor();

  const data = useMatchData(id!, profile!.id);
  const { handleStopwatch } = useStopwatch(id!, data.match, data.setMatch, data.setElapsed);

  const [activeTab, setActiveTab] = useState<MatchTabId>("register");
  const [showEndSheet, setShowEndSheet] = useState(false);

  const teamLetters = data.currentTeams.map((t) => t.letter);
  const gameState =
    data.currentTeams.length >= 2 ? computeGameState(teamLetters, data.rounds) : null;

  const getName = useCallback(
    (uid: string) => {
      const r = data.registrations.find((r) => r.user_id === uid);
      return r ? (r.user.nickname ?? r.user.full_name) : uid;
    },
    [data.registrations]
  );

  const handleRoundResult = useCallback(
    async (winner: string | null) => {
      if (!gameState) return;
      void Haptics.notificationAsync(
        winner ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
      const [t1, t2] = gameState.playing;
      const nextNum = data.rounds.length + 1;
      const t1data = data.currentTeams.find((t) => t.letter === t1);
      const t2data = data.currentTeams.find((t) => t.letter === t2);

      data.setRounds((prev) => [
        ...prev,
        { id: "", round_number: nextNum, team1_letter: t1, team2_letter: t2, winner, duration_sec: data.elapsed },
      ]);
      await handleStopwatch("reset");
      await supabase.from("match_rounds").insert({
        match_id: id!,
        round_number: nextNum,
        team1_letter: t1,
        team2_letter: t2,
        team_a_ids: t1data?.playerIds ?? [],
        team_b_ids: t2data?.playerIds ?? [],
        winner,
        duration_sec: data.elapsed,
      });
    },
    [gameState, data.rounds, data.currentTeams, data.elapsed, data.setRounds, handleStopwatch, id]
  );

  if (!data.match) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted }}>טוען...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={data.onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HeroHeader
          showBack
          subtitle={`📍 ${data.match.pitch_name}  ·  ${formatMatchDate(data.match.scheduled_at)}`}
          title={data.match.title}
          emoji="⚽"
          rightSlot={
            data.isActive ? (
              <View style={{ flexDirection: "row-reverse" }}>
                <Badge label="🔴 משחק פעיל" tone="success" />
              </View>
            ) : data.isFinished ? (
              <View style={{ flexDirection: "row-reverse" }}>
                <Badge label="הסתיים" tone="neutral" />
              </View>
            ) : null
          }
        />

        <View style={{ paddingHorizontal: 16, marginTop: -16 }}>
          <TabSwitcher
            value={activeTab}
            options={[
              { id: "register", label: "הרשמה" },
              { id: "teams", label: "קבוצות" },
              { id: "rounds", label: "משחקונים", disabled: !data.isActive && !data.isFinished },
            ]}
            onChange={(v) => setActiveTab(v as MatchTabId)}
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <FadeInUp key={activeTab}>
            {activeTab === "register" && (
              <RegistrationTab
                confirmed={data.confirmed}
                waiting={data.waiting}
                payments={data.payments}
                myReg={data.myReg}
                myPayment={data.myPayment}
                isFull={data.isFull}
                isAdmin={data.isAdmin}
                isManager={data.isManager}
                isActive={data.isActive ?? false}
                isFinished={data.isFinished ?? false}
                match={data.match}
                myMatchRatings={data.myMatchRatings}
                profileId={profile!.id}
                onRegister={data.handleRegister}
                onConfirmPayment={data.handleConfirmPayment}
                onRatePlayer={data.handleRatePlayer}
              />
            )}

            {activeTab === "teams" && (
              <TeamsTab
                confirmed={data.confirmed}
                currentTeams={data.currentTeams}
                numTeams={data.numTeams}
                splitOptions={data.splitOptions}
                playerRatings={data.playerRatings}
                isAdmin={data.isAdmin}
                isActive={data.isActive ?? false}
                isFinished={data.isFinished ?? false}
                getName={getName}
                onSetNumTeams={data.setNumTeams}
                onShuffle={data.handleShuffle}
                onStartMatch={data.handleStartMatch}
                onUpdatePlayerRating={data.updatePlayerRating}
              />
            )}

            {activeTab === "rounds" && (data.isActive || data.isFinished) && gameState && (
              <RoundsTab
                rounds={data.rounds}
                currentTeams={data.currentTeams}
                gameState={gameState}
                matchResult={data.matchResult}
                avgRatings={data.avgRatings}
                confirmed={data.confirmed}
                elapsed={data.elapsed}
                isActive={data.isActive ?? false}
                isFinished={data.isFinished ?? false}
                isAdmin={data.isAdmin}
                cfgFor={cfgFor}
                getName={getName}
                onStopwatch={handleStopwatch}
                onRoundResult={handleRoundResult}
                onEndMatch={() => setShowEndSheet(true)}
                stopwatchRunning={!!data.match.stopwatch_running}
              />
            )}
          </FadeInUp>
        </View>
      </ScrollView>

      {showEndSheet && (
        <EndMatchSheet
          matchId={id!}
          teamId={data.match.team_id}
          players={data.confirmed}
          teams={data.currentTeams.map((t) => ({
            letter: t.letter,
            name: t.cfg.name,
            bg: t.cfg.bg,
            border: t.cfg.border,
            text: t.cfg.text,
          }))}
          onClose={() => setShowEndSheet(false)}
          onDone={() => { setShowEndSheet(false); data.load(); }}
        />
      )}
    </Screen>
  );
}
