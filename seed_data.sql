-- Run this script in your Supabase SQL Editor to populate fake data for testing!

DO $$
DECLARE
  team1_id UUID := gen_random_uuid();
  team2_id UUID := gen_random_uuid();
  match1_id UUID := gen_random_uuid();
  match2_id UUID := gen_random_uuid();
BEGIN
  -- 1. Insert Demo Teams
  INSERT INTO teams (id, name, paste_text) VALUES 
  (team1_id, 'VGC 2024 Standard Balance', 'Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
EVs: 252 HP / 156 Def / 100 SpD
Careful Nature
- Flare Blitz
- Knock Off
- Parting Shot
- Fake Out

Flutter Mane @ Booster Energy
Ability: Protosynthesis
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Dazzling Gleam
- Shadow Ball
- Icy Wind
- Protect'),
  (team2_id, 'Hard Trick Room', 'Ursaluna-Bloodmoon @ Life Orb
Ability: Mind''s Eye
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Blood Moon
- Hyper Voice
- Earth Power
- Protect');

  -- 2. Insert Demo Matches (Using a public sample MP4 for the video_url)
  INSERT INTO matches (id, own_team_id, played_at, result, video_url, opponent_team) VALUES
  (
    match1_id, 
    team1_id, 
    NOW(), 
    'win', 
    'https://www.w3schools.com/html/mov_bbb.mp4', 
    '[{"name": "incineroar", "id": "727"}, {"name": "rillaboom", "id": "812"}, {"name": "urshifu-rapid-strike", "id": "10191"}, {"name": "flutter-mane", "id": "987"}, {"name": "tornadus", "id": "641"}, {"name": "ogerpon-hearthflame", "id": "1017"}]'::jsonb
  ),
  (
    match2_id, 
    team2_id, 
    NOW() - interval '1 day', 
    'loss', 
    'https://www.w3schools.com/html/mov_bbb.mp4', 
    '[{"name": "amoonguss", "id": "591"}, {"name": "iron-hands", "id": "992"}, {"name": "landorus-therian", "id": "1001"}, {"name": "chien-pao", "id": "1002"}, {"name": "dragonite", "id": "149"}, {"name": "gholdengo", "id": "1000"}]'::jsonb
  );

  -- 3. Insert Demo Annotations / Notes
  
  -- Match 1 Notes
  INSERT INTO match_notes (match_id, tab, turn_number, actual_note, correct_note) VALUES
  (match1_id, 'select', NULL, 'Good matchup. I lead Incineroar + Rillaboom to cycle Intimidate and Fake Out.', 'Should have kept Flutter Mane in the back. Ogerpon was useless here.'),
  (match1_id, 'battle', 1, 'Used Fake out on Tornadus and U-turned on Urshifu.', 'Correct play. Gained huge momentum.'),
  (match1_id, 'battle', 2, 'Switched into my restricted.', 'Terrible switch, took way too much damage from Wood Hammer.'),
  (match1_id, 'improvements', NULL, 'I need to respect Wood Hammer damage ranges more. Stop making aggressive switches when behind on board state.', NULL);

  -- Match 2 Notes
  INSERT INTO match_notes (match_id, tab, turn_number, actual_note, correct_note) VALUES
  (match2_id, 'select', NULL, 'They have Amoonguss so Trick Room is going to be very hard to set up.', NULL),
  (match2_id, 'improvements', NULL, 'Need to find a better answer to Spore. Maybe add Safety Goggles to the team?', NULL);

END $$;
