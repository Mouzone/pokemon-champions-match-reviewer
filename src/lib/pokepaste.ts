export interface ParsedPokemon {
  name: string;
  item: string;
  ability: string;
  teraType: string;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  nature: string;
  moves: string[];
}

export function parsePokepaste(paste: string | null | undefined): ParsedPokemon[] {
  if (!paste) return [];
  const blocks = paste.trim().split(/\n\s*\n/);
  
  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return null;

    const firstLine = lines[0];
    let name = firstLine;
    let item = '';
    
    if (firstLine.includes('@')) {
      const parts = firstLine.split('@');
      name = parts[0].trim();
      item = parts[1].trim();
    }
    
    // Remove gender (M) or (F)
    name = name.replace(/\([MF]\)/i, '').trim();

    const result: ParsedPokemon = {
      name,
      item,
      ability: '',
      teraType: '',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: '',
      moves: []
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Ability:')) result.ability = line.replace('Ability:', '').trim();
      else if (line.startsWith('Tera Type:')) result.teraType = line.replace('Tera Type:', '').trim();
      else if (line.startsWith('EVs:')) {
        const evParts = line.replace('EVs:', '').split('/');
        evParts.forEach(part => {
          const [val, stat] = part.trim().split(' ');
          if (stat.toLowerCase() === 'hp') result.evs.hp = parseInt(val) || 0;
          if (stat.toLowerCase() === 'atk') result.evs.atk = parseInt(val) || 0;
          if (stat.toLowerCase() === 'def') result.evs.def = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spa') result.evs.spa = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spd') result.evs.spd = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spe') result.evs.spe = parseInt(val) || 0;
        });
      }
      else if (line.startsWith('IVs:')) {
        const ivParts = line.replace('IVs:', '').split('/');
        ivParts.forEach(part => {
          const [val, stat] = part.trim().split(' ');
          if (stat.toLowerCase() === 'hp') result.ivs.hp = parseInt(val) || 0;
          if (stat.toLowerCase() === 'atk') result.ivs.atk = parseInt(val) || 0;
          if (stat.toLowerCase() === 'def') result.ivs.def = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spa') result.ivs.spa = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spd') result.ivs.spd = parseInt(val) || 0;
          if (stat.toLowerCase() === 'spe') result.ivs.spe = parseInt(val) || 0;
        });
      }
      else if (line.includes('Nature')) result.nature = line.replace('Nature', '').trim();
      else if (line.startsWith('-')) result.moves.push(line.replace('-', '').trim());
    }

    return result;
  }).filter(Boolean) as ParsedPokemon[];
}

export function formatPokeApiName(name: string): string {
  let formatted = name.toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^a-z0-9-]/g, ''); // strip special chars
  return formatted;
}

export function getShowdownSpriteName(name: string): string {
  let base = formatPokeApiName(name.replace(/\([MF]\)/i, ''));

  // Standardize regional prefixes to suffixes
  const regions: Record<string, string> = {
    'alolan-': '-alola',
    'galarian-': '-galar',
    'hisuian-': '-hisui',
    'paldean-': '-paldea'
  };
  for (const [prefix, suffix] of Object.entries(regions)) {
    if (base.startsWith(prefix)) {
      base = base.replace(prefix, '') + suffix;
      break;
    }
  }

  // Explicit form mappings that Showdown uses with hyphens
  const HYPHENATED_FORMS: Record<string, string> = {
    'ursaluna-bloodmoon': 'ursaluna-bloodmoon',
    'ogerpon-wellspring': 'ogerpon-wellspring',
    'ogerpon-hearthflame': 'ogerpon-hearthflame',
    'ogerpon-cornerstone': 'ogerpon-cornerstone',
    'indeedee-f': 'indeedee-f',
    'meowstic-f': 'meowstic-f',
    'basculegion-f': 'basculegion-f',
    'oinkologne-f': 'oinkologne-f',
    'toxtricity-low-key': 'toxtricity-lowkey',
    'floette-eternal': 'floette-eternal',
    'morpeko-hangry': 'morpeko-hangry',
  };

  if (HYPHENATED_FORMS[base]) return HYPHENATED_FORMS[base];

  // Keep hyphens for common regional and alternate form suffixes
  if (base.match(/-(alola|galar|hisui|paldea|gmax|primal|origin|crowned|ice|shadow)$/)) return base;

  // Gender-suffixed forms: strip -male (default form), keep -f (female form)
  if (base.endsWith('-male')) {
    const stripped = base.replace('-male', '');
    return stripped.replace(/-/g, '');
  }
  if (base.endsWith('-female')) {
    const stripped = base.replace('-female', '-f');
    // Check if it's a known hyphenated female form
    if (HYPHENATED_FORMS[stripped]) return HYPHENATED_FORMS[stripped];
    return stripped.replace(/-/g, '');
  }

  if (base.startsWith('urshifu-rapid')) return 'urshifu-rapidstrike';
  if (base === 'morpeko-full-belly') return 'morpeko';
  if (base.endsWith('-incarnate')) return base.replace('-incarnate', '');
  if (base.includes('-therian')) return base;
  if (base.includes('-mega')) return base.replace(/-mega-([xy])/i, '-mega$1');
  return base.replace(/-/g, '');
}

export const NATURES: Record<string, { inc: string, dec: string }> = {
  Adamant: { inc: 'atk', dec: 'spa' },
  Jolly: { inc: 'spe', dec: 'spa' },
  Timid: { inc: 'spe', dec: 'atk' },
  Modest: { inc: 'spa', dec: 'atk' },
  Quiet: { inc: 'spa', dec: 'spe' },
  Brave: { inc: 'atk', dec: 'spe' },
  Calm: { inc: 'spd', dec: 'atk' },
  Careful: { inc: 'spd', dec: 'spa' },
  Sassy: { inc: 'spd', dec: 'spe' },
  Bold: { inc: 'def', dec: 'atk' },
  Impish: { inc: 'def', dec: 'spa' },
  Relaxed: { inc: 'def', dec: 'spe' },
  Lonely: { inc: 'atk', dec: 'def' },
  Naughty: { inc: 'atk', dec: 'spd' },
  Mild: { inc: 'spa', dec: 'def' },
  Rash: { inc: 'spa', dec: 'spd' },
  Gentle: { inc: 'spd', dec: 'def' },
  Lax: { inc: 'def', dec: 'spd' },
  Hasty: { inc: 'spe', dec: 'def' },
  Naive: { inc: 'spe', dec: 'spd' }
};

export function calculateStat(base: number, ev: number, iv: number, level: number, statName: string, nature: string, item?: string): number {
  if (statName === 'hp') {
    if (base === 1) return 1; // Shedinja
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
  }
  
  let natureMult = 1.0;
  const nat = NATURES[nature];
  if (nat) {
    if (nat.inc === statName) natureMult = 1.1;
    if (nat.dec === statName) natureMult = 0.9;
  }

  let stat = Math.floor(Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureMult);

  if (item) {
    const i = item.toLowerCase();
    if (statName === 'spe' && i === 'choice scarf') stat = Math.floor(stat * 1.5);
    if (statName === 'atk' && i === 'choice band') stat = Math.floor(stat * 1.5);
    if (statName === 'spa' && i === 'choice specs') stat = Math.floor(stat * 1.5);
    if (statName === 'spd' && i === 'assault vest') stat = Math.floor(stat * 1.5);
    if ((statName === 'def' || statName === 'spd') && i === 'eviolite') stat = Math.floor(stat * 1.5);
  }

  return stat;
}
