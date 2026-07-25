export type Result = 'win' | 'loss' | 'tie';

export interface Team {
  id: string;
  created_at: string;
  name: string;
  paste_text?: string;
  moves_image_url?: string;
  spreads_image_url?: string;
}

export interface PokemonInfo {
  name: string;
  id: string;
}

export interface Match {
  id: string;
  created_at: string;
  played_at: string;
  opponent_team: PokemonInfo[];
  own_team_id: string | null;
  result: Result;
  video_url: string;
}

export interface MatchNote {
  id: string;
  match_id: string;
  tab: 'select' | 'battle' | 'improvements';
  turn_number?: number;
  actual_note?: string;
  correct_note?: string;
}
