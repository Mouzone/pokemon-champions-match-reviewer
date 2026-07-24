import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/"/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const match1Team1 = `
Incineroar @ Sitrus Berry  
Ability: Intimidate  
Level: 50  
Tera Type: Grass  
EVs: 236 HP / 4 Atk / 116 Def / 116 SpD / 36 Spe  
Careful Nature  
- Flare Blitz  
- Knock Off  
- Parting Shot  
- Fake Out  

Ogerpon-Wellspring (F) @ Wellspring Mask  
Ability: Water Absorb  
Level: 50  
Tera Type: Water  
EVs: 236 HP / 140 Def / 132 Spe  
Jolly Nature  
- Ivy Cudgel  
- Horn Leech  
- Spiky Shield  
- Follow Me  

Urshifu-Rapid-Strike @ Mystic Water  
Ability: Unseen Fist  
Level: 50  
Tera Type: Water  
EVs: 44 HP / 156 Atk / 4 Def / 52 SpD / 252 Spe  
Adamant Nature  
- Surging Strikes  
- Close Combat  
- Aqua Jet  
- Detect  

Tornadus (M) @ Covert Cloak  
Ability: Prankster  
Level: 50  
Tera Type: Dark  
EVs: 252 HP / 140 Def / 116 SpD  
Calm Nature  
- Bleakwind Storm  
- Tailwind  
- Taunt  
- Protect  

Gholdengo @ Choice Specs  
Ability: Good as Gold  
Level: 50  
Tera Type: Steel  
EVs: 244 HP / 4 Def / 116 SpA / 4 SpD / 140 Spe  
Modest Nature  
- Make It Rain  
- Shadow Ball  
- Thunderbolt  
- Trick  

Rillaboom @ Assault Vest  
Ability: Grassy Surge  
Level: 50  
Tera Type: Fire  
EVs: 132 HP / 116 Atk / 44 Def / 156 SpD / 60 Spe  
Adamant Nature  
- Wood Hammer  
- Grassy Glide  
- U-turn  
- Fake Out  
`;

async function insertMatch(date, result) {
  const t1 = await supabase.from('teams').insert({
    name: 'Tie Game Team',
    paste_text: match1Team1
  }).select().single();
  
  if (t1.error) console.error(t1.error);

  const m = await supabase.from('matches').insert({
    played_at: date,
    own_team_id: t1.data.id,
    result: result,
    video_url: 'https://youtube.com/watch?v=12345',
    opponent_team: [
      { name: "flutter-mane", id: "987" },
      { name: "chi-yu", id: "1004" },
      { name: "amoonguss", id: "591" },
      { name: "ursaluna-bloodmoon", id: "10271" },
      { name: "iron-hands", id: "992" },
      { name: "farigiraf", id: "981" }
    ]
  }).select().single();

  if (m.error) console.error(m.error);
  console.log('Inserted tie match for', t1.data.id);
}

async function run() {
  await insertMatch(new Date().toISOString(), 'tie');
  console.log('Done');
}
run();
