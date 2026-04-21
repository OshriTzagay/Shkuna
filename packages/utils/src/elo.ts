// Phase 1: simple football points (win=3, draw=1, loss=0)
// Phase 2: full ELO with opponent weighting

export type MatchOutcome = "win" | "draw" | "loss";

export function getPointsDelta(outcome: MatchOutcome): number {
  switch (outcome) {
    case "win":
      return 3;
    case "draw":
      return 1;
    case "loss":
      return 0;
  }
}

// Phase 2 ELO — not active yet, ready for future use
export function calcEloChange(
  myRating: number,
  opponentRating: number,
  outcome: MatchOutcome,
  kFactor = 32
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
  const actual = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
  return Math.round(kFactor * (actual - expected));
}
