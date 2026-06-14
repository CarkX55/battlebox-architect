// src/services/synergyActivationEngine.js

// Definición de reglas heurísticas para inferencia dinámica
const INFERENCE_RULES = [
  {
    signal: "ninjutsu_enabler",
    match: (oracle, typeLine) => oracle.includes("ninjutsu") || oracle.includes("can't be blocked"),
    boost: ["ninjutsu", "unblockable", "evasion", "changeling", "combat damage to a player"],
    penalty: ["enters tapped", "defender"]
  },
  {
    signal: "blink_engine",
    match: (oracle, typeLine) => (oracle.includes("exile") && oracle.includes("return") && oracle.includes("battlefield under")) || oracle.includes("blink") || oracle.includes("flicker"),
    boost: ["enters the battlefield", "etb trigger", "flash", "enters"],
    penalty: ["aura", "equipment"]
  },
  {
    signal: "sac_outlet",
    match: (oracle, typeLine) => oracle.includes("sacrifice a") || oracle.includes("sacrifice another"),
    boost: ["dies", "whenever another creature dies", "sacrifice fodder", "blood artist", "token"],
    penalty: ["legendary"]
  },
  {
    signal: "landfall_engine",
    match: (oracle, typeLine) => oracle.includes("landfall") || (oracle.includes("whenever a land enters") && oracle.includes("under your control")),
    boost: ["search your library for a land", "additional land", "fetch land", "basic land"],
    penalty: []
  },
  {
    signal: "storm_enabler",
    match: (oracle, typeLine) => oracle.includes("storm") || (oracle.includes("whenever you cast") && oracle.includes("instant or sorcery")),
    boost: ["cost less to cast", "add", "draw", "copy target", "cantrip"],
    penalty: ["creature", "planeswalker"]
  },
  {
    signal: "counter_doubler",
    match: (oracle, typeLine) => oracle.includes("+1/+1 counter") && (oracle.includes("double") || oracle.includes("additional") || oracle.includes("proliferate")),
    boost: ["+1/+1 counter", "counter", "modular", "proliferate"],
    penalty: []
  }
];

export function extractActivationSignals(currentDeckContext, ragPool) {
  const signals = new Set();
  
  if (!currentDeckContext || !Array.isArray(currentDeckContext) || !ragPool || !Array.isArray(ragPool)) {
    return [];
  }

  currentDeckContext.forEach(card => {
    const cardNameLower = card.name.toLowerCase();
    
    // Obtener la carta desde el pool de RAG para leer su oracle text y type line
    const poolCard = ragPool.find(p => p.name.toLowerCase() === cardNameLower);
    if (poolCard) {
      const oracle = (poolCard.oracle_text || '').toLowerCase();
      const typeLine = (poolCard.type_line || '').toLowerCase();
      
      // Evaluar todas las reglas de inferencia
      INFERENCE_RULES.forEach(rule => {
        if (rule.match(oracle, typeLine)) {
          signals.add(rule.signal);
        }
      });
    }
  });
  
  return Array.from(signals);
}

export function getSignalBoosts(signals) {
  const boosts = {};
  if (!signals || !Array.isArray(signals)) return boosts;
  
  signals.forEach(signal => {
    const rule = INFERENCE_RULES.find(r => r.signal === signal);
    if (rule && rule.boost) {
      rule.boost.forEach(term => {
        boosts[term] = (boosts[term] || 0) + 60;
      });
    }
  });
  return boosts;
}
