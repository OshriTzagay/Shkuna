-- Stores the jersey color chosen by the manager for each team slot.
-- Format: { "A": "red", "B": "blue", "C": "yellow" }
-- Values are keys from the JERSEY_PALETTES map in the mobile app.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS jersey_colors jsonb NOT NULL DEFAULT '{}';
