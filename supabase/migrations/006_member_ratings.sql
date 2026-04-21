-- Allow all team members (not just admins) to rate players after a finished match
DROP POLICY IF EXISTS "ratings: admin write" ON match_player_ratings;

CREATE POLICY "ratings: member insert"
  ON match_player_ratings FOR INSERT
  WITH CHECK (
    rated_by = auth.uid()
    AND exists (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status = 'finished'
        AND is_team_member(m.team_id)
    )
  );

CREATE POLICY "ratings: member update own"
  ON match_player_ratings FOR UPDATE
  USING (rated_by = auth.uid());
