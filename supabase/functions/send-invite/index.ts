import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://shkuna.app";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { team_id, phone } = await req.json();
  if (!team_id || !phone) return new Response("team_id and phone required", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // verify caller is team admin
  const authHeader = req.headers.get("Authorization");
  const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") ?? "");
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["manager", "assistant"].includes(membership.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  // get team + inviter info
  const { data: team } = await supabase.from("teams").select("name, invite_token").eq("id", team_id).single();
  const { data: inviter } = await supabase.from("users").select("full_name, nickname").eq("id", user.id).single();
  if (!team || !inviter) return new Response("Not found", { status: 404 });

  const inviterName = (inviter as any).nickname ?? (inviter as any).full_name;
  const link = `${APP_URL}/join/${team.invite_token}`;

  // Send SMS via Twilio
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER")!;

  const normalized = phone.replace(/\D/g, "");
  const intl = normalized.startsWith("0") ? `+972${normalized.slice(1)}` : `+${normalized}`;
  const message = `היי! ${inviterName} מזמין אותך להצטרף לקבוצת "${team.name}" באפליקציית שכונה ⚽\nלחץ: ${link}`;

  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: intl, From: twilioFrom, Body: message }),
    }
  );

  if (!twilioRes.ok) {
    const err = await twilioRes.text();
    return new Response(JSON.stringify({ error: "SMS failed", details: err }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, sent_to: intl }), {
    headers: { "Content-Type": "application/json" },
  });
});
