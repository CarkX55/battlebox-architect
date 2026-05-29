import React, { useMemo, memo } from 'react';
import { cn } from '../../utils/cn';
import { BarChart3 } from 'lucide-react';

const ManaCurve = memo(({ deck, compact = false, isPrint = false, archetype = '' }) => {
  const stats = useMemo(() => {
    const s = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
    if (!deck || !Array.isArray(deck)) return s;
    
    deck.forEach(card => {
      // Ignorar tierras
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land')) return;
      
      // Ser tolerante con el nombre del campo de coste (mana_value, cmc, cost)
      const rawCmc = card.mana_value !== undefined ? card.mana_value : (card.cmc !== undefined ? card.cmc : card.cost);
      const cmc = Number(rawCmc || 0);
      const qty = Number(card.quantity || 1);
      
      if (cmc >= 6) s['6+'] += qty;
      else s[Math.floor(cmc)] += qty;
    });
    
    return s;
  }, [deck]);

  const curveAnalysis = useMemo(() => {
    if (!deck || !Array.isArray(deck) || !archetype) return null;
    
    let totalCmc = 0;
    let spellCount = 0;

    deck.forEach(card => {
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land')) return;
      
      const rawCmc = card.mana_value !== undefined ? card.mana_value : (card.cmc !== undefined ? card.cmc : card.cost);
      const cmc = Number(rawCmc || 0);
      const qty = Number(card.quantity || 1);
      
      totalCmc += (cmc * qty);
      spellCount += qty;
    });

    if (spellCount === 0) return null;
    
    const avgCmc = totalCmc / spellCount;
    const arch = archetype.toLowerCase();
    
    let status = 'optimal';
    let message = '';

    if (arch.includes('aggro')) {
      if (avgCmc > 2.5) { status = 'high'; message = `Curva Peligrosamente Alta para Aggro (${avgCmc.toFixed(2)} CMC). Debería ser < 2.2.`; }
      else if (avgCmc > 2.2) { status = 'warning'; message = `Curva algo alta para Aggro (${avgCmc.toFixed(2)} CMC). Ideal: < 2.2.`; }
      else { message = `Curva Óptima para Aggro (${avgCmc.toFixed(2)} CMC). Ideal: < 2.2.`; }
    } else if (arch.includes('midrange')) {
      if (avgCmc > 3.0) { status = 'high'; message = `Curva Alta para Midrange (${avgCmc.toFixed(2)} CMC). Ideal: 2.2 - 2.8.`; }
      else if (avgCmc < 1.8) { status = 'low'; message = `Curva Baja para Midrange (${avgCmc.toFixed(2)} CMC). Puede faltar impacto en lategame.`; }
      else { message = `Curva Óptima para Midrange (${avgCmc.toFixed(2)} CMC). Ideal: 2.2 - 2.8.`; }
    } else if (arch.includes('control') || arch.includes('combo')) {
      if (avgCmc > 3.5) { status = 'high'; message = `Curva muy alta para Control/Combo (${avgCmc.toFixed(2)} CMC). Ideal: 2.5 - 3.2.`; }
      else if (avgCmc < 2.0) { status = 'low'; message = `Curva inusualmente baja para Control/Combo (${avgCmc.toFixed(2)} CMC).`; }
      else { message = `Curva Óptima para Control/Combo (${avgCmc.toFixed(2)} CMC). Ideal: 2.5 - 3.2.`; }
    } else {
      message = `Curva Media: ${avgCmc.toFixed(2)} CMC`;
    }

    return { status, message, avgCmc };
  }, [deck, archetype]);

  const manaBaseAnalysis = useMemo(() => {
    if (!deck || !Array.isArray(deck) || isPrint || compact) return null;

    let pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let landCount = 0;

    // Base de datos estática de tierras del meta para detección perfecta
    const landColorMap = {
      // Triomas
      "Raffine's Tower": ['W', 'U', 'B'],
      "Xander's Lounge": ['U', 'B', 'R'],
      "Ziatora's Proving Ground": ['B', 'R', 'G'],
      "Jetmir's Garden": ['R', 'G', 'W'],
      "Spara's Headquarters": ['G', 'W', 'U'],
      "Indatha Triome": ['W', 'B', 'G'],
      "Ketria Triome": ['U', 'R', 'G'],
      "Raugrin Triome": ['U', 'R', 'W'],
      "Savai Triome": ['W', 'B', 'R'],
      "Zagoth Triome": ['U', 'B', 'G'],

      // Shocklands
      "Watery Grave": ['U', 'B'],
      "Steam Vents": ['U', 'R'],
      "Overgrown Tomb": ['B', 'G'],
      "Temple Garden": ['G', 'W'],
      "Hallowed Fountain": ['W', 'U'],
      "Blood Crypt": ['B', 'R'],
      "Stomping Ground": ['R', 'G'],
      "Sacred Foundry": ['R', 'W'],
      "Godless Shrine": ['W', 'B'],
      "Breeding Pool": ['G', 'U'],

      // Original Duals
      "Underground Sea": ['U', 'B'],
      "Volcanic Island": ['U', 'R'],
      "Bayou": ['B', 'G'],
      "Savannah": ['G', 'W'],
      "Tundra": ['W', 'U'],
      "Badlands": ['B', 'R'],
      "Taiga": ['R', 'G'],
      "Scrubland": ['W', 'B'],
      "Plateau": ['R', 'W'],
      "Tropical Island": ['G', 'U'],

      // Fastlands
      "Darkslick Shores": ['U', 'B'],
      "Spirebluff Canal": ['U', 'R'],
      "Blooming Marsh": ['B', 'G'],
      "Razorverge Thicket": ['G', 'W'],
      "Seachrome Coast": ['W', 'U'],
      "Blackcleave Cliffs": ['B', 'R'],
      "Copperline Gorge": ['R', 'G'],
      "Inspiring Vantage": ['R', 'W'],
      "Concealed Courtyard": ['W', 'B'],
      "Botanical Sanctum": ['G', 'U'],

      // Fetchlands (Acceso indirecto)
      "Flooded Strand": ['W', 'U'],
      "Polluted Delta": ['U', 'B'],
      "Bloodstained Mire": ['B', 'R'],
      "Wooded Foothills": ['R', 'G'],
      "Windswept Heath": ['G', 'W'],
      "Marsh Flats": ['W', 'B'],
      "Scalding Tarn": ['U', 'R'],
      "Verdant Catacombs": ['B', 'G'],
      "Arid Mesa": ['R', 'W'],
      "Misty Rainforest": ['G', 'U'],
      "Prismatic Vista": ['W', 'U', 'B', 'R', 'G'],

      // Painlands
      "Underground River": ['U', 'B'],
      "Shivan Reef": ['U', 'R'],
      "Llanowar Wastes": ['B', 'G'],
      "Brushland": ['G', 'W'],
      "Adarkar Wastes": ['W', 'U'],
      "Sulfurous Springs": ['B', 'R'],
      "Karplusan Forest": ['R', 'G'],
      "Battlefield Forge": ['R', 'W'],
      "Caves of Koilos": ['W', 'B'],
      "Yavimaya Coast": ['G', 'U'],

      // Horizon Lands
      "Sunbaked Canyon": ['R', 'W'],
      "Fiery Islet": ['U', 'R'],
      "Silent Clearing": ['W', 'B'],
      "Nurturing Peatland": ['B', 'G'],
      "Waterlogged Grove": ['G', 'U'],
      "Horizon Canopy": ['G', 'W'],

      // Slowlands
      "Shipwreck Marsh": ['U', 'B'],
      "Stormcarved Coast": ['U', 'R'],
      "Deathcap Glade": ['B', 'G'],
      "Overgrown Farmland": ['G', 'W'],
      "Deserted Beach": ['W', 'U'],
      "Haunted Ridge": ['B', 'R'],
      "Rockfall Vale": ['R', 'G'],
      "Sundown Pass": ['R', 'W'],
      "Shattered Sanctuary": ['W', 'B'],
      "Dreamroot Cascade": ['G', 'U'],

      // Channel/Utility Lands
      "Boseiju, Who Endures": ['G'],
      "Otawara, Soaring City": ['U'],
      "Eiganjo, Seat of the Empire": ['W'],
      "Takenuma, Abandoned Mire": ['B'],
      "Sokenzan, Crucible of Defiance": ['R']
    };

    deck.forEach(card => {
      const type = (card.type_line || card.type || '').toLowerCase();
      const name = card.name || '';
      const qty = Number(card.quantity || 1);

      if (type.includes('land') || card.category === 'Land') {
        landCount += qty;
        
        // 1. Intentar lookup directo en nuestra base de datos estática
        if (landColorMap[name]) {
          landColorMap[name].forEach(color => {
            if (sources[color] !== undefined) sources[color] += qty;
          });
          return;
        }

        // 2. Intentar buscar en produced_mana de Scryfall
        let produced = [...(card.produced_mana || [])];
        
        // 3. Fallbacks heurísticos basados en el nombre
        if (produced.length === 0) {
           const nameLower = name.toLowerCase();
           if (type.includes('plains') || nameLower.includes('plains')) produced.push('W');
           if (type.includes('island') || nameLower.includes('island')) produced.push('U');
           if (type.includes('swamp') || nameLower.includes('swamp')) produced.push('B');
           if (type.includes('mountain') || nameLower.includes('mountain')) produced.push('R');
           if (type.includes('forest') || nameLower.includes('forest')) produced.push('G');
        }
        
        // 4. Último recurso: color_identity
        if (produced.length === 0 && card.color_identity && card.color_identity.length > 0) {
           produced = card.color_identity.filter(c => c !== 'C');
        }

        produced.forEach(color => {
          if (sources[color] !== undefined) sources[color] += qty;
        });
      } else {
        const cost = card.mana_cost || '';
        if (cost.includes('{W}')) pips.W += (cost.match(/\{W\}/g) || []).length * qty;
        if (cost.includes('{U}')) pips.U += (cost.match(/\{U\}/g) || []).length * qty;
        if (cost.includes('{B}')) pips.B += (cost.match(/\{B\}/g) || []).length * qty;
        if (cost.includes('{R}')) pips.R += (cost.match(/\{R\}/g) || []).length * qty;
        if (cost.includes('{G}')) pips.G += (cost.match(/\{G\}/g) || []).length * qty;
      }
    });

    if (landCount === 0) return null;

    let warnings = [];
    const colorEmojis = { W: 'Llanuras ☀️', U: 'Islas 💧', B: 'Pantanos 💀', R: 'Montañas 🔥', G: 'Bosques 🌳' };

    // Cálculo dinámico de umbrales óptimos basados en el Pro Tour de Karsten
    Object.keys(pips).forEach(color => {
      const colorPips = pips[color];
      const colorSources = sources[color];

      if (colorPips > 0) {
        if (colorSources === 0) {
           warnings.push(`Faltan fuentes para ${colorEmojis[color]}`);
        } else {
           // Umbrales dinámicos adaptativos según volumen de pips
           let minNeeded = 3; // Splash mínimo
           if (colorPips >= 2 && colorPips <= 4) minNeeded = 5; // Splash moderado
           if (colorPips >= 5 && colorPips <= 8) minNeeded = 8; // Presencia sólida
           if (colorPips >= 9 && colorPips <= 12) minNeeded = 11; // Core del mazo
           if (colorPips > 12) minNeeded = 13; // Heavy pips / Dobles pips tempranos

           if (colorSources < minNeeded) {
              warnings.push(`Poco maná para ${colorEmojis[color]} (${colorSources} fuentes de ${minNeeded} recomendadas)`);
           }
        }
      }
    });

    // Control del total de tierras adaptado al formato
    if (landCount > 0 && landCount < 18) warnings.push(`Pocas tierras en total (${landCount})`);
    else if (landCount > 28) warnings.push(`Demasiadas tierras (${landCount})`);

    if (warnings.length === 0) {
       return { status: 'optimal', message: `Base de maná óptima y equilibrada (${landCount} tierras). El Juez aprueba la distribución.` };
    } else {
       return { status: 'warning', message: 'Inspector de Tierras: ' + warnings.join(' | ') };
    }
  }, [deck, isPrint, compact]);

  const maxVal = Math.max(...Object.values(stats), 1);

  return (
    <div className={cn(
      isPrint ? "bg-transparent border-none p-0 pt-5" : "leather-panel shadow-2xl",
      compact && !isPrint ? "p-3" : (!isPrint ? "p-6" : "")
    )}>
      {!compact && !isPrint && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h4 className="font-cinzel text-[#c19b45] text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#c19b45]" /> Distribución de Costes
          </h4>
          
          <div className="flex flex-col gap-2">
            {curveAnalysis && (
              <div className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold shadow-inner border transition-all duration-300",
                curveAnalysis.status === 'high' ? "bg-red-500/10 text-red-400 border-red-500/30" : 
                curveAnalysis.status === 'low' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                curveAnalysis.status === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-green-500/10 text-green-400 border-green-500/30"
              )}>
                {curveAnalysis.status === 'optimal' ? <span className="text-green-400">✨</span> : <span className="animate-pulse">⚠️</span>}
                {curveAnalysis.message}
              </div>
            )}
            
            {manaBaseAnalysis && (
              <div className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold shadow-inner border transition-all duration-300",
                manaBaseAnalysis.status === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"
              )}>
                {manaBaseAnalysis.status === 'optimal' ? <span className="text-green-400">⚖️</span> : <span className="animate-pulse">🗺️</span>}
                {manaBaseAnalysis.message}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={cn("flex items-end justify-between gap-1", compact || isPrint ? "h-12" : "h-28")}>
        {Object.entries(stats).map(([cmc, count]) => {
          const height = (count / maxVal) * 100;
          return (
            <div key={cmc} className="flex-1 flex flex-col items-center group h-full justify-end">
              <div className="relative w-full flex flex-col items-center h-full justify-end">
                {/* Conteo siempre visible en impresión */}
                    {count > 0 && (
                      <span className={cn(
                        "absolute -top-6 transition-opacity font-bold leather-stats",
                        isPrint ? "text-[6px] text-black opacity-100" : "opacity-0 group-hover:opacity-100 bg-black/90 px-2 py-0.5 rounded-md border border-[#ffdf91]/30",
                        compact && !isPrint ? "text-[8px]" : "text-sm"
                      )}>
                        {count}
                      </span>
                    )}
                    
                    {/* Barra */}
                    <div 
                      className={cn(
                        "w-full transition-all duration-700 ease-out",
                        count > 0 
                          ? (isPrint ? "bg-[#92732c] rounded-t-[0.5mm]" : "bg-gradient-to-t from-[#c19b45]/40 to-[#ffdf91] rounded-t-[2px] hover:brightness-125") 
                          : (isPrint ? "bg-black/10 h-[0.1mm]" : "bg-white/5 h-[1px] opacity-20")
                      )}
                      style={{ 
                        height: count > 0 ? `${Math.max(6, height)}%` : (isPrint ? '0.1mm' : '1px'),
                        boxShadow: count > 0 && !isPrint ? '0 0 15px rgba(255, 223, 145, 0.2)' : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Etiqueta de CMC */}
                  <span className={cn(
                    "mt-2 font-bold",
                    isPrint ? "text-[6px] text-black" : (compact ? "text-[9px] text-[#ffdf91]/50" : "text-xs text-[#ffdf91]")
                  )} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                    {cmc}
                  </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ManaCurve;
