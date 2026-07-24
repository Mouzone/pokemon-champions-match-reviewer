import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const teamPaste = `Ogerpon-Hearthflame (F) @ Hearthflame Mask
Ability: Mold Breaker
Level: 50
Tera Type: Fire
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Ivy Cudgel
- Horn Leech
- Spiky Shield
- Follow Me

Incineroar @ Figy Berry
Ability: Intimidate
Level: 50
Tera Type: Ghost
EVs: 252 HP / 116 Atk / 20 Def / 116 SpD / 4 Spe
Careful Nature
- Flare Blitz
- Knock Off
- Parting Shot
- Fake Out

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
Tera Type: Water
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect

Flutter Mane @ Booster Energy
Ability: Protosynthesis
Level: 50
Tera Type: Fairy
EVs: 252 HP / 4 Def / 116 SpA / 4 SpD / 132 Spe
Modest Nature
- Moonblast
- Shadow Ball
- Icy Wind
- Protect

Amoonguss @ Rocky Helmet
Ability: Regenerator
Level: 50
Tera Type: Water
EVs: 252 HP / 156 Def / 100 SpD
Bold Nature
- Spore
- Rage Powder
- Pollen Puff
- Clear Smog

Chien-Pao @ Focus Sash
Ability: Sword of Ruin
Level: 50
Tera Type: Ghost
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Icicle Crash
- Sucker Punch
- Sacred Sword
- Protect`;

async function updateTeams() {
  const { data, error } = await supabase
    .from('teams')
    .update({ paste_text: teamPaste })
    .neq('name', 'asdf'); // Update all rows

  if (error) {
    console.error('Error updating teams:', error);
  } else {
    console.log('Successfully updated teams with 6 Pokemon paste!');
  }
}

updateTeams();
