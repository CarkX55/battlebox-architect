import React from 'react';
import { COLORS } from '../../constants/legacyBattleBox';
import { cn } from '../../utils/cn';

export default function ManaOrb({ color, size = 'w-6 h-6', className = '' }) {
  const colorData = COLORS.find(c => c.id === color);
  
  // Colores de brillo personalizados para cada maná
  const glowColors = {
    W: 'rgba(255, 255, 220, 0.4)',
    U: 'rgba(0, 150, 255, 0.4)',
    B: 'rgba(150, 0, 255, 0.2)',
    R: 'rgba(255, 50, 0, 0.4)',
    G: 'rgba(50, 255, 50, 0.4)',
    C: 'rgba(200, 200, 200, 0.3)'
  };

  const glowColor = glowColors[color] || 'rgba(255,255,255,0.2)';
  const icon = colorData?.icon || '';

  if (!icon && color !== 'C') return null;

  return (
    <div className={cn(
      "relative rounded-full flex items-center justify-center transition-all duration-300 group select-none",
      size,
      className
    )}>
      {/* Resplandor exterior (Glow) */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 group-hover:opacity-60 blur-[10px] transition-all duration-500"
        style={{ boxShadow: `0 0 15px ${glowColor}` }}
      />
      
      {/* Cuerpo del Cristal */}
      <div className="absolute inset-[1px] rounded-full overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]">
        {/* Imagen del Símbolo */}
        {icon ? (
          <img 
            src={icon} 
            alt={color} 
            className="w-[115%] h-[115%] max-w-none object-contain relative z-10"
          />
        ) : (
          <span className="text-white font-bold text-[10px] relative z-10">◇</span>
        )}
        
        {/* Reflejo de Cristal (Glossy) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
        
        {/* Brillo especular superior */}
        <div className="absolute top-[10%] left-[15%] w-[40%] h-[30%] bg-gradient-to-b from-white/30 to-transparent rounded-full blur-[2px] pointer-events-none" />
      </div>
    </div>
  );
}
