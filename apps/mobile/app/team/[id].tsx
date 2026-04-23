import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth";
import { formatMatchDate } from "@shkuna/utils";
import { useTheme } from "@/hooks/useTheme";
import {
  Screen,
  HeroHeader,
  Card,
  Button,
  Input,
  Avatar,
  Badge,
  PressableScale,
  FadeInUp,
  SectionTitle,
} from "@/components/ui";
import { useTeamData } from "@/features/team/hooks/useTeamData";
import { MemberRow } from "@/features/team/components/MemberRow";
import type { MatchWithResult } from "@/features/team/hooks/useTeamData";
import type { UserRole } from "@shkuna/db";

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuthStore();

  const teamData = useTeamData(id!, profile!.id);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showJerseyModal, setShowJerseyModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [paymentLink, setPaymentLink] = useState(teamData.team?.whatsapp_payment_link ?? "");

  if (!teamData.team) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textMuted }}>טוען...</Text>
        </View>
      </Screen>
    );
  }

  const { team, activeMembers, isAdmin, isManager, upcomingMatches, pastMatches } = teamData;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={teamData.refreshing}
            onRefresh={teamData.onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HeroHeader
          showBack
          subtitle={`📍 ${team.city}`}
          title={team.name}
          emoji="🏟️"
          rightSlot={
            <View style={{ flexDirection: "row-reverse", gap: 8 }}>
              <Badge label={`${activeMembers.length} שחקנים`} tone="primary" />
            </View>
          }
        />

        <View style={{ paddingHorizontal: 16, marginTop: -18, gap: 14 }}>
          {/* ── Admin quick actions ── */}
          {isAdmin && (
            <FadeInUp delay={50}>
              <View style={{ flexDirection: "row-reverse", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="צור משחק"
                    icon="add"
                    onPress={() => router.push(`/match/create?teamId=${id}`)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="הזמן שחקן"
                    icon="person-add-outline"
                    variant="secondary"
                    onPress={() => setShowInviteModal(true)}
                  />
                </View>
              </View>
            </FadeInUp>
          )}

          {/* ── Jersey + payment info row ── */}
          <FadeInUp delay={100}>
            <Card padding={6}>
              <InfoRow
                icon="👕"
                label="מחזיק גופיות"
                value={teamData.getJerseyHolderName() ?? "לא הוגדר"}
                onPress={isAdmin ? () => setShowJerseyModal(true) : undefined}
              />
              {isManager && (
                <>
                  <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
                  <InfoRow
                    iconName="card"
                    label="קישור תשלום"
                    value={team.whatsapp_payment_link || "לא הוגדר"}
                    onPress={() => { setPaymentLink(team.whatsapp_payment_link ?? ""); setShowPaymentModal(true); }}
                  />
                </>
              )}
            </Card>
          </FadeInUp>

          {/* ── Upcoming matches ── */}
          {upcomingMatches.length > 0 && (
            <FadeInUp delay={150}>
              <SectionTitle title="משחקים קרובים" />
              <Card padding={6}>
                <FlatList
                  data={upcomingMatches}
                  keyExtractor={(m) => m.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
                  )}
                  renderItem={({ item: match }) => (
                    <PressableScale onPress={() => router.push(`/match/${match.id}`)} scaleTo={0.99}>
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: colors.primaryDim,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons name="football" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right" }}>
                            {match.title}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "right" }}>
                            📍 {match.pitch_name}  ·  {formatMatchDate(match.scheduled_at)}
                          </Text>
                        </View>
                        {match.status === "active" && <Badge label="🔴 פעיל" tone="success" />}
                        <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                      </View>
                    </PressableScale>
                  )}
                />
              </Card>
            </FadeInUp>
          )}

          {/* ── Members ── */}
          <FadeInUp delay={200}>
            <SectionTitle
              title={`שחקנים (${activeMembers.length})`}
              trailing={
                isAdmin ? (
                  <PressableScale onPress={teamData.syncRatingsFromMatches}>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        gap: 4,
                        alignItems: "center",
                        backgroundColor: colors.primaryDim,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                      }}
                    >
                      <Ionicons name="sync-outline" size={12} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }}>
                        עדכן דירוגים
                      </Text>
                    </View>
                  </PressableScale>
                ) : undefined
              }
            />
            <Card padding={6}>
              <FlatList
                data={activeMembers}
                keyExtractor={(m) => m.user_id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
                )}
                renderItem={({ item: member }) => (
                  <MemberRow
                    member={member}
                    isJerseyHolder={team.jersey_holder_id === member.user_id}
                    isAdmin={isAdmin}
                    isManager={isManager}
                    isSelf={member.user_id === profile!.id}
                    onUpdateSkillRating={teamData.updateSkillRating}
                    onUpdateRole={teamData.updateRole}
                  />
                )}
              />
            </Card>
          </FadeInUp>

          {/* ── Match history ── */}
          {pastMatches.length > 0 && (
            <FadeInUp delay={250}>
              <SectionTitle title={`היסטוריית משחקים (${pastMatches.length})`} />
              <Card padding={6}>
                <FlatList
                  data={pastMatches}
                  keyExtractor={(m) => m.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />
                  )}
                  renderItem={({ item: match }) => (
                    <MatchHistoryRow
                      match={match}
                      getMvpName={teamData.getMvpName}
                      onPress={() => router.push(`/match/${match.id}`)}
                      colors={colors}
                    />
                  )}
                />
              </Card>
            </FadeInUp>
          )}
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <SheetModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="הזמן שחקן"
      >
        <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>
          הכנס מספר טלפון ונשלח הזמנה בוואטסאפ
        </Text>
        <Input
          placeholder="050-000-0000"
          value={invitePhone}
          onChangeText={setInvitePhone}
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Button
          label="שלח הזמנה בוואטסאפ"
          icon="logo-whatsapp"
          variant="success"
          size="lg"
          onPress={() =>
            teamData.sendInvite(invitePhone, () => {
              setInvitePhone("");
              setShowInviteModal(false);
            })
          }
        />
      </SheetModal>

      <SheetModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="קישור תשלום"
      >
        <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>
          קישור ביט / PayBox שישלח לשחקנים
        </Text>
        <Input
          placeholder="https://bit.ly/..."
          value={paymentLink}
          onChangeText={setPaymentLink}
          keyboardType="url"
          autoCapitalize="none"
          rtl={false}
          icon="link-outline"
        />
        <Button
          label="שמור"
          size="lg"
          onPress={() => teamData.savePaymentLink(paymentLink, () => setShowPaymentModal(false))}
        />
      </SheetModal>

      <SheetModal
        visible={showJerseyModal}
        onClose={() => setShowJerseyModal(false)}
        title="מחזיק גופיות 👕"
        scrollable
      >
        <Text style={{ color: colors.textSecondary, textAlign: "right", fontSize: 13 }}>
          בחר מי מחזיק את הגופיות של הקבוצה
        </Text>
        {team.jersey_holder_id && (
          <PressableScale onPress={() => teamData.setJerseyHolder(null, () => setShowJerseyModal(false))}>
            <View
              style={{
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.errorDim,
                borderWidth: 1,
                borderColor: colors.error + "40",
              }}
            >
              <Text style={{ color: colors.error, textAlign: "right", fontWeight: "700" }}>
                הסר מחזיק גופיות
              </Text>
            </View>
          </PressableScale>
        )}
        {activeMembers.map((m) => {
          const active = team.jersey_holder_id === m.user_id;
          return (
            <PressableScale
              key={m.user_id}
              onPress={() => teamData.setJerseyHolder(m.user_id, () => setShowJerseyModal(false))}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: active ? colors.primaryDim : colors.bgSurface,
                  borderWidth: 1,
                  borderColor: active ? colors.primaryMuted : colors.border,
                  gap: 12,
                }}
              >
                <Avatar name={m.user.full_name} size={36} />
                <Text
                  style={{
                    flex: 1,
                    color: active ? colors.primary : colors.textPrimary,
                    fontWeight: active ? "800" : "600",
                    textAlign: "right",
                  }}
                >
                  {m.user.nickname ?? m.user.full_name}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </View>
            </PressableScale>
          );
        })}
      </SheetModal>
    </Screen>
  );
}

// ── Local sub-components ────────────────────────────────────────

function InfoRow({
  icon,
  iconName,
  label,
  value,
  onPress,
}: {
  icon?: string;
  iconName?: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={onPress ? 0.99 : 1}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: colors.primaryDim,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {iconName ? (
            <Ionicons name={iconName as any} size={18} color={colors.primary} />
          ) : (
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right" }}>
            {label}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "right" }} numberOfLines={1}>
            {value}
          </Text>
        </View>
        {onPress && <Ionicons name="chevron-back" size={16} color={colors.textMuted} />}
      </View>
    </PressableScale>
  );
}

function MatchHistoryRow({
  match,
  getMvpName,
  onPress,
  colors,
}: {
  match: MatchWithResult;
  getMvpName: (id: string | null) => string | null;
  onPress: () => void;
  colors: any;
}) {
  const mvpName = getMvpName(match.result?.mvp_user_id ?? null);
  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <View style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right" }}>
            {match.title}
          </Text>
          <Ionicons name="chevron-back" size={14} color={colors.textMuted} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "right", marginTop: 2 }}>
          {formatMatchDate(match.scheduled_at)}  ·  📍 {match.pitch_name}
        </Text>
        <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 6 }}>
          {match.result?.total_rounds ? (
            <Badge label={`${match.result.total_rounds} מחזורים`} tone="neutral" />
          ) : null}
          {mvpName && <Badge label={`🏆 MVP: ${mvpName}`} tone="warning" />}
        </View>
      </View>
    </PressableScale>
  );
}

function SheetModal({
  visible,
  onClose,
  title,
  children,
  scrollable,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  const { colors } = useTheme();
  const Body = scrollable ? ScrollView : View;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={{
              paddingTop: 18,
              paddingHorizontal: 22,
              paddingBottom: 14,
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "800" }}>
              {title}
            </Text>
            <PressableScale onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </PressableScale>
          </View>
          <Body
            {...(scrollable
              ? { contentContainerStyle: { padding: 22, gap: 12 } }
              : { style: { padding: 22, gap: 14, flex: 1 } as any })}
          >
            {children}
          </Body>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
