import { useState } from "react";
import { View, Text, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, PressableScale } from "@/components/ui";
import type { RegWithUser, PaymentWithUser, FullMatch } from "../types";
import { buildPaymentReminderUrl } from "@shkuna/utils";

interface Props {
  confirmed: RegWithUser[];
  waiting: RegWithUser[];
  payments: PaymentWithUser[];
  myReg: RegWithUser | undefined;
  myPayment: PaymentWithUser | undefined;
  isFull: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isActive: boolean;
  isFinished: boolean;
  match: FullMatch;
  myMatchRatings: Record<string, number>;
  profileId: string;
  onRegister: () => void;
  onConfirmPayment: () => void;
  onRatePlayer: (userId: string, rating: number) => void;
}

export function RegistrationTab({
  confirmed,
  waiting,
  payments,
  myReg,
  myPayment,
  isFull,
  isAdmin,
  isManager,
  isActive,
  isFinished,
  match,
  myMatchRatings,
  profileId,
  onRegister,
  onConfirmPayment,
  onRatePlayer,
}: Props) {
  const { colors } = useTheme();
  const isIn = myReg && myReg.status !== "cancelled";
  const isWaiting = myReg?.status === "waiting";
  const paidCount = payments.filter((p) => p.status === "paid").length;

  return (
    <View style={{ gap: 12 }}>

      {/* ── Capacity bar + register ── */}
      <Card padding={16}>
        {/* progress */}
        <View style={{ gap: 8, marginBottom: 14 }}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.textPrimary, fontWeight: "800", fontSize: 15 }}>
              {confirmed.length} / {match.max_players}
            </Text>
            {isFull && (
              <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "700" }}>המשחק מלא ⚡</Text>
            )}
            {waiting.length > 0 && !isFull && (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>⏳ {waiting.length} ממתינים</Text>
            )}
          </View>
          <CapacityBar confirmed={confirmed.length} max={match.max_players} />
        </View>

        {/* player chips */}
        {confirmed.length > 0 ? (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {confirmed.map((r, i) => (
              <PlayerChip
                key={r.user_id}
                name={r.user.nickname ?? r.user.full_name}
                isSelf={r.user_id === profileId}
                index={i + 1}
              />
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 13, marginBottom: 14 }}>
            עדיין אין נרשמים
          </Text>
        )}

        {/* waiting chips — compact */}
        {waiting.length > 0 && (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {waiting.map((r) => (
              <PlayerChip
                key={r.user_id}
                name={r.user.nickname ?? r.user.full_name}
                isSelf={r.user_id === profileId}
                waiting
              />
            ))}
          </View>
        )}

        {/* register button */}
        {!isFinished && (
          <Button
            label={
              isWaiting ? "הסר מרשימת המתנה"
              : isIn     ? "לא אגיע ❌"
              : isFull   ? "⏳ רשימת המתנה"
              :            "אני בא! ✅"
            }
            variant={isIn ? "secondary" : "primary"}
            size="lg"
            onPress={onRegister}
          />
        )}
      </Card>

      {/* ── My payment ── */}
      {(isActive || isFinished) && myPayment?.status === "pending" && (
        <Card padding={14}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warningDim, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="cash-outline" size={18} color={colors.warning} />
            </View>
            <Text style={{ color: colors.textPrimary, fontWeight: "700", flex: 1, textAlign: "right" }}>
              לא שילמת עדיין
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            <Button label="שילמתי ✅" variant="success" onPress={onConfirmPayment} />
            {match.team?.whatsapp_payment_link && (
              <Button
                label="לתשלום"
                variant="outline"
                icon="open-outline"
                onPress={() => Linking.openURL(match.team.whatsapp_payment_link!)}
              />
            )}
          </View>
        </Card>
      )}

      {/* ── Admin: payments overview ── */}
      {isAdmin && (isActive || isFinished) && payments.length > 0 && (
        <Card padding={14}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: "800" }}>תשלומים</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {paidCount} / {payments.length} שילמו
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            {payments.map((p) => (
              <View
                key={p.user_id}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: p.status === "paid" ? colors.primaryDim : colors.bgSurface,
                  gap: 10,
                }}
              >
                <Ionicons
                  name={p.status === "paid" ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={p.status === "paid" ? colors.primary : colors.textMuted}
                />
                <Text style={{ flex: 1, color: colors.textPrimary, textAlign: "right", fontSize: 13 }}>
                  {p.user.nickname ?? p.user.full_name}
                </Text>
                {p.status !== "paid" && isManager && match.team?.whatsapp_payment_link && (
                  <PressableScale
                    onPress={() =>
                      Linking.openURL(
                        buildPaymentReminderUrl(p.user.phone, match.team.whatsapp_payment_link!, match.title)
                      )
                    }
                  >
                    <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                  </PressableScale>
                )}
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ── Post-match ratings ── */}
      {isFinished && confirmed.length > 1 && (
        <Card padding={14}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", textAlign: "right", marginBottom: 12 }}>
            ⭐ דרג שחקנים
          </Text>
          <View style={{ gap: 4 }}>
            {confirmed
              .filter((r) => r.user_id !== profileId)
              .map((r) => {
                const given = myMatchRatings[r.user_id] ?? 0;
                return (
                  <View
                    key={r.user_id}
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      paddingVertical: 9,
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
                        <PressableScale key={star} onPress={() => onRatePlayer(r.user_id, star)} scaleTo={0.82}>
                          <Ionicons
                            name={star <= given ? "star" : "star-outline"}
                            size={20}
                            color={given > 0 ? colors.warning : colors.textDisabled}
                          />
                        </PressableScale>
                      ))}
                    </View>
                  </View>
                );
              })}
          </View>
        </Card>
      )}
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function CapacityBar({ confirmed, max }: { confirmed: number; max: number }) {
  const { colors } = useTheme();
  const pct = Math.min(confirmed / max, 1);
  const color = pct >= 1 ? colors.warning : pct >= 0.7 ? colors.primary : colors.primary;
  return (
    <View style={{ height: 6, backgroundColor: colors.bgSurface, borderRadius: 999, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct * 100}%`, backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}

function PlayerChip({
  name,
  isSelf,
  waiting,
  index,
}: {
  name: string;
  isSelf: boolean;
  waiting?: boolean;
  index?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: waiting ? colors.bgSurface : isSelf ? colors.primaryDim : colors.bgSurface,
        borderWidth: 1,
        borderColor: waiting ? colors.border : isSelf ? colors.primaryMuted : colors.border,
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 5,
      }}
    >
      {waiting && <Text style={{ fontSize: 10 }}>⏳</Text>}
      <Text style={{ color: isSelf ? colors.primary : colors.textPrimary, fontSize: 12, fontWeight: isSelf ? "800" : "600" }}>
        {name}
      </Text>
      {index !== undefined && (
        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700" }}>
          {index}.
        </Text>
      )}
    </View>
  );
}
