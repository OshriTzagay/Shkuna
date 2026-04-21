ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS winning_team_letter char(1);
