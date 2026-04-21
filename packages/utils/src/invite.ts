const APP_URL =
  process.env.EXPO_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://shkuna.app";

export function buildInviteLink(inviteToken: string): string {
  return `${APP_URL}/join/${inviteToken}`;
}

export function buildWhatsAppInviteUrl(
  teamName: string,
  inviterName: string,
  inviteToken: string
): string {
  const link = buildInviteLink(inviteToken);
  const text = encodeURIComponent(
    `היי! ${inviterName} מזמין אותך להצטרף לקבוצת "${teamName}" באפליקציית שכונה 🏟️\nלחץ כאן להצטרפות:\n${link}`
  );
  return `https://wa.me/?text=${text}`;
}

export function buildWhatsAppInviteUrlForPhone(
  phone: string,
  teamName: string,
  inviterName: string,
  inviteToken: string
): string {
  const link = buildInviteLink(inviteToken);
  const text = encodeURIComponent(
    `היי! ${inviterName} מזמין אותך להצטרף לקבוצת "${teamName}" באפליקציית שכונה 🏟️\nלחץ כאן להצטרפות:\n${link}`
  );
  const normalized = phone.replace(/\D/g, "");
  const intl = normalized.startsWith("0") ? `972${normalized.slice(1)}` : normalized;
  return `https://wa.me/${intl}?text=${text}`;
}

export function buildPaymentReminderUrl(
  phone: string,
  paymentLink: string,
  matchTitle: string
): string {
  const text = encodeURIComponent(
    `היי, עדיין לא שילמת עבור המשחק "${matchTitle}" 💸\nקישור לתשלום: ${paymentLink}`
  );
  const normalized = phone.replace(/\D/g, "");
  const intl = normalized.startsWith("0") ? `972${normalized.slice(1)}` : normalized;
  return `https://wa.me/${intl}?text=${text}`;
}
