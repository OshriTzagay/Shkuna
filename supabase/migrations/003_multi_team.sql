-- Allow team letters A-F for multi-team splits
ALTER TABLE match_teams
  DROP CONSTRAINT IF EXISTS match_teams_team_letter_check;

ALTER TABLE match_teams
  ADD CONSTRAINT match_teams_team_letter_check
  CHECK (team_letter IN ('A', 'B', 'C', 'D', 'E', 'F'));
