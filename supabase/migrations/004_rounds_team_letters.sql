-- Add team letter tracking to match_rounds for winner-stays game logic
ALTER TABLE match_rounds
  ADD COLUMN IF NOT EXISTS team1_letter char(1),
  ADD COLUMN IF NOT EXISTS team2_letter char(1);

-- Drop old winner constraint (was 'A'/'B'/'D') — now stores actual team letter or NULL for draw
ALTER TABLE match_rounds
  DROP CONSTRAINT IF EXISTS match_rounds_winner_check;

-- Allow NULL winner (= draw)
ALTER TABLE match_rounds
  ALTER COLUMN winner DROP NOT NULL;
