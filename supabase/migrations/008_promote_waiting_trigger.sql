-- When a confirmed registration is cancelled, automatically promote
-- the earliest waiting player if a slot is now available.

CREATE OR REPLACE FUNCTION promote_waiting_player()
RETURNS TRIGGER AS $$
DECLARE
  v_max_players   int;
  v_confirmed_cnt int;
  v_next_user_id  uuid;
BEGIN
  -- Only fire when status transitions TO 'cancelled'
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT max_players INTO v_max_players
  FROM matches WHERE id = NEW.match_id;

  SELECT COUNT(*) INTO v_confirmed_cnt
  FROM match_registrations
  WHERE match_id = NEW.match_id AND status = 'confirmed';

  IF v_confirmed_cnt < v_max_players THEN
    SELECT user_id INTO v_next_user_id
    FROM match_registrations
    WHERE match_id = NEW.match_id AND status = 'waiting'
    ORDER BY registered_at ASC
    LIMIT 1;

    IF v_next_user_id IS NOT NULL THEN
      UPDATE match_registrations
      SET status = 'confirmed'
      WHERE match_id = NEW.match_id AND user_id = v_next_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_promote_waiting ON match_registrations;
CREATE TRIGGER trg_promote_waiting
  AFTER UPDATE ON match_registrations
  FOR EACH ROW EXECUTE FUNCTION promote_waiting_player();
