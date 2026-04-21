-- הרץ את זה רק אם קיבלת שגיאת "already exists"
-- מנקה הכל ומתחיל מחדש

drop table if exists team_points_history cascade;
drop table if exists match_player_ratings cascade;
drop table if exists payments cascade;
drop table if exists match_results cascade;
drop table if exists match_rounds cascade;
drop table if exists match_teams cascade;
drop table if exists match_registrations cascade;
drop table if exists matches cascade;
drop table if exists team_members cascade;
drop table if exists teams cascade;
drop table if exists users cascade;

drop type if exists user_role cascade;
drop type if exists match_status cascade;
drop type if exists registration_status cascade;
drop type if exists payment_status cascade;
drop type if exists round_winner cascade;

drop function if exists auth_uid cascade;
drop function if exists is_team_member cascade;
drop function if exists is_team_admin cascade;
drop function if exists is_team_manager cascade;
drop function if exists update_cost_per_player cascade;
drop function if exists create_payment_on_confirm cascade;
