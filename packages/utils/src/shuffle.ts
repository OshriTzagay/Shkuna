export interface PlayerForShuffle {
  id: string;
  full_name: string;
  nickname: string | null;
  skill_rating: number;
}

export interface TeamResult {
  letter: string;
  players: PlayerForShuffle[];
  sum: number;
}

export interface ShuffleResult {
  teams: TeamResult[];
  // legacy 2-team support
  teamA: PlayerForShuffle[];
  teamB: PlayerForShuffle[];
}

const TEAM_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Greedy N-team balancing: sort desc by skill_rating,
 * each player joins the team with the lowest current sum.
 */
export function shuffleTeams(
  players: PlayerForShuffle[],
  numTeams = 2
): ShuffleResult {
  const n = Math.min(numTeams, TEAM_LETTERS.length);
  const sorted = [...players].sort((a, b) => b.skill_rating - a.skill_rating);
  const teams: TeamResult[] = Array.from({ length: n }, (_, i) => ({
    letter: TEAM_LETTERS[i]!,
    players: [],
    sum: 0,
  }));

  for (const player of sorted) {
    const target = teams.reduce((min, t) => (t.sum < min.sum ? t : min));
    target.players.push(player);
    target.sum += player.skill_rating;
  }

  return {
    teams,
    teamA: teams[0]?.players ?? [],
    teamB: teams[1]?.players ?? [],
  };
}

/**
 * Suggest split options based on player count.
 * Returns list of { numTeams, playersPerTeam } options.
 */
export function suggestSplits(
  playerCount: number
): { numTeams: number; playersPerTeam: number; label: string }[] {
  const options = [];
  for (let t = 2; t <= 4; t++) {
    const perTeam = Math.floor(playerCount / t);
    if (perTeam < 3) continue;
    options.push({
      numTeams: t,
      playersPerTeam: perTeam,
      label: `${t} קבוצות של ${perTeam}${playerCount % t > 0 ? "–" + (perTeam + 1) : ""}`,
    });
  }
  return options;
}

export function displayName(player: PlayerForShuffle): string {
  return player.nickname ?? player.full_name;
}
