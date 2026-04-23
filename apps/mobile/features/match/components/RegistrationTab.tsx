import { FlatList, View, Text, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Card, Button, SectionTitle, PressableScale } from "@/components/ui";
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

  const registerLabel =
    myReg?.status === "confirmed"
      ? "❌ לא אגיע"
      : myReg?.status === "waiting"
      ? "❌ הסר מרשימת המתנה"
      : isFull
      ? "⏳ הצטרף לרשימת המתנה"
      : "✅ אני בא!";

  return (
    <View style={{ gap: 14 }}>
      {/* ── Registration list ── */}
      <Card padding={16}>
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: "800" }}>
            מי בא? ({confirmed.length}/{match.max_players})
          </Text>
          {isFull && (
            <View
              style={{
                backgroundColor: colors.warningDim,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "700" }}>המשחק מלא</Text>
            </View>
          )}
        </View>

        {confirmed.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 13, paddingVertical: 12 }}>
            עדיין אין נרשמים
          </Text>
        ) : (
          <FlatList
            data={confirmed}
            keyExtractor={(r) => r.user_id}
            scrollEnabled={false}
            renderItem={({ item: r }) => (
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.primaryDim,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 14 }}>
                  {r.user.nickname ?? r.user.full_name}
                </Text>
              </View>
            )}
          />
        )}

        {waiting.length > 0 && (
          <View
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                textAlign: "right",
                marginBottom: 4,
                fontWeight: "700",
              }}
            >
              רשימת המתנה ({waiting.length})
            </Text>
            {waiting.map((r) => (
              <View
                key={r.user_id}
                style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 14 }}>⏳</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {r.user.nickname ?? r.user.full_name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!isFinished && (
          <View style={{ marginTop: 14 }}>
            <Button
              label={registerLabel}
              variant={myReg && myReg.status !== "cancelled" ? "secondary" : "primary"}
              onPress={onRegister}
            />
          </View>
        )}
      </Card>

      {/* ── Payments ── */}
      {(isActive || isFinished) && (
        <Card padding={16}>
          <SectionTitle title="תשלומים" />
          {myPayment?.status === "pending" && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              <Button label="✅ שילמתי!" variant="success" onPress={onConfirmPayment} />
              {match.team?.whatsapp_payment_link && (
                <Button
                  label="פתח קישור תשלום"
                  variant="outline"
                  icon="open-outline"
                  onPress={() => Linking.openURL(match.team.whatsapp_payment_link!)}
                />
              )}
            </View>
          )}
          {isAdmin && (
            <FlatList
              data={payments}
              keyExtractor={(p) => p.user_id}
              scrollEnabled={false}
              renderItem={({ item: p }) => (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    paddingVertical: 8,
                    gap: 10,
                  }}
                >
                  <Ionicons
                    name={p.status === "paid" ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={p.status === "paid" ? colors.primary : colors.error}
                  />
                  <Text style={{ flex: 1, color: colors.textPrimary, textAlign: "right" }}>
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
                      <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>
                        שלח תזכורת
                      </Text>
                    </PressableScale>
                  )}
                </View>
              )}
            />
          )}
        </Card>
      )}

      {/* ── Post-match player ratings ── */}
      {isFinished && confirmed.length > 0 && (
        <Card padding={16}>
          <Text style={{ color: colors.textPrimary, fontWeight: "800", textAlign: "right" }}>
            דרג את השחקנים
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 11, textAlign: "right", marginBottom: 10 }}
          >
            הדירוג משפיע על ממוצע הפרופיל של כל שחקן
          </Text>
          <FlatList
            data={confirmed.filter((r) => r.user_id !== profileId)}
            keyExtractor={(r) => r.user_id}
            scrollEnabled={false}
            renderItem={({ item: r }) => {
              const given = myMatchRatings[r.user_id] ?? 0;
              return (
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, flex: 1, textAlign: "right" }}>
                    {r.user.nickname ?? r.user.full_name}
                  </Text>
                  <View style={{ flexDirection: "row-reverse", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <PressableScale
                        key={star}
                        onPress={() => onRatePlayer(r.user_id, star)}
                        scaleTo={0.85}
                      >
                        <Ionicons
                          name={star <= given ? "star" : "star-outline"}
                          size={22}
                          color={given > 0 ? colors.warning : colors.textDisabled}
                        />
                      </PressableScale>
                    ))}
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
