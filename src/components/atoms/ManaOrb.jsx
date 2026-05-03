import { COLORS } from '../../constants/legacyBattleBox';

export default function ManaOrb({ color, size = "w-5 h-5", className = "" }) {
  const colorData = COLORS.find(c => c.id === color);
  
  if (!colorData) {
    // Fallback para Incoloro o errores
    if (color === 'C') {
      return (
        <div 
          className={`${size} rounded-full bg-gray-400 border border-black/50 shadow-lg flex items-center justify-center text-[8px] font-bold text-black ${className}`}
          title="Incoloro"
        >
          ◇
        </div>
      );
    }
    return null;
  }

  return (
    <img 
      src={colorData.icon} 
      alt={colorData.name} 
      title={colorData.name}
      className={`${size} rounded-full shadow-lg border border-black/50 object-contain ${className}`} 
    />
  );
}
