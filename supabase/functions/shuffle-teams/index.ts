import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Player {
  id: string;
  full_name: string;
  nickname: string | null;
  skill_rating: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const { match_id } = await req.json();
  if (!match_id) return new Response("match_id required", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // get confirmed registrations with skill ratings
  const { data: regs, error } = await supabase
    .from("match_registrations")
    .select("user_id, users(full_name, nickname), team_members!inner(skill_rating)")
    .eq("match_id", match_id)
    .eq("status", "confirmed");

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const players: Player[] = (regs ?? []).map((r: any) => ({
    id: r.user_id,
    full_name: r.users.full_name,
    nickname: r.users.nickname,
    skill_rating: r.team_members?.skill_rating ?? 3,
  }));

  if (players.length < 2) {
    return new Response(JSON.stringify({ error: "Not enough players" }), { status: 400 });
  }

  // greedy shuffle
  const sorted = [...players].sort((a, b) => b.skill_rating - a.skill_rating);
  const teamA: Player[] = [], teamB: Player[] = [];
  let sumA = 0, sumB = 0;
  for (const p of sorted) {
    if (sumA <= sumB) { teamA.push(p); sumA += p.skill_rating; }
    else { teamB.push(p); sumB += p.skill_rating; }
  }

  // get requesting user id from auth header
  const authHeader = req.headers.get("Authorization");
  const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") ?? "");

  // delete old splits, insert new
  await supabase.from("match_teams").delete().eq("match_id", match_id);
  await supabase.from("match_teams").insert([
    { match_id, team_letter: "A", player_ids: teamA.map((p) => p.id), generated_by: user?.id },
    { match_id, team_letter: "B", player_ids: teamB.map((p) => p.id), generated_by: user?.id },
  ]);

  return new Response(JSON.stringify({
    teamA: teamA.map((p) => ({ id: p.id, name: p.nickname ?? p.full_name, rating: p.skill_rating })),
    teamB: teamB.map((p) => ({ id: p.id, name: p.nickname ?? p.full_name, rating: p.skill_rating })),
    sumA,
    sumB,
  }), { headers: { "Content-Type": "application/json" } });
});
