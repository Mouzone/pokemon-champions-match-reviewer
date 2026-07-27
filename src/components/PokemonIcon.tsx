import React from 'react';
import { getShowdownSpriteName } from '../lib/pokepaste';

interface PokemonIconProps {
  name: string;
  style?: React.CSSProperties;
  className?: string;
}

export const PokemonIcon: React.FC<PokemonIconProps> = ({ name, style, className }) => {
  return (
    <img 
      src={`https://play.pokemonshowdown.com/sprites/gen5/${getShowdownSpriteName(name)}.png`} 
      alt={name} 
      className={className}
      style={style}
      onError={(e) => (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}
    />
  );
};
