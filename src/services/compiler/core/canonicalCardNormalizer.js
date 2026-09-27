/**
 * src/services/compiler/core/canonicalCardNormalizer.js
 * 
 * CanonicalCardNormalizer: Universal Single Source of Truth (SSOT) for Card & DFC Representation.
 * 
 * Guarantees uniform, immutable normalization across single-faced cards and transforming
 * double-faced cards (DFCs / MDFCs). Eliminates downstream discrepancies where DFCs could
 * erroneously fall back to CMC 0 or lose face-specific oracle text and type lines.
 * 
 * Universal Axiom:
 * Zero hardcoded card names or tribal conditions. Normalization is derived strictly from
 * card structure, card_faces, mana costs, and standard MTG rules.
 */

/**
 * Extracts the canonical mana value (CMC) for any card or DFC.
 * Strictly avoids falling back to 0 when mana cost or face mana values are present.
 * 
 * @param {Object} card 
 * @returns {number}
 */
export function extractCanonicalCmc(card) {
  if (!card) return 0;
  const cardObj = card.cardObj || card;
  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  // 1. Check positive numeric properties on root, cardObj, or front face (> 0 takes priority)
  const numericCandidates = [
    card.cmc,
    card.mana_value,
    cardObj.cmc,
    cardObj.mana_value,
    faces[0]?.cmc,
    faces[0]?.mana_value
  ];

  for (const cand of numericCandidates) {
    if (typeof cand === 'number' && !isNaN(cand) && cand > 0) {
      return cand;
    }
    if (typeof cand === 'string' && cand.trim() !== '') {
      const parsed = parseFloat(cand);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  // 2. Parse mana_cost string from root, cardObj, or card faces
  const manaCostsToTry = [
    card.mana_cost,
    cardObj.mana_cost,
    faces[0]?.mana_cost,
    faces[1]?.mana_cost
  ];

  for (const manaCost of manaCostsToTry) {
    if (manaCost && typeof manaCost === 'string') {
      let cost = 0;
      const matches = manaCost.match(/\{([^}]+)\}/g);
      if (matches && matches.length > 0) {
        for (const m of matches) {
          const symbol = m.replace(/[{}]/g, '').trim().toUpperCase();
          const num = parseInt(symbol, 10);
          if (!isNaN(num)) {
            cost += num;
          } else if (symbol !== 'X' && symbol !== 'Y' && symbol !== 'Z') {
            // Color pips, hybrid, phyrexian, snow
            cost += 1;
          }
        }
        if (cost > 0) return cost;
      }
    }
  }

  // 3. True zero mana value (e.g. Lands, 0-cost artifacts like Ornithopter/Mox)
  for (const cand of numericCandidates) {
    if (typeof cand === 'number' && !isNaN(cand) && cand === 0) {
      return 0;
    }
  }

  return 0;
}

/**
 * Extracts combined canonical oracle text across all card faces.
 * 
 * @param {Object} card 
 * @returns {string}
 */
export function extractCanonicalOracleText(card) {
  if (!card) return '';
  const cardObj = card.cardObj || card;
  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  let rootOracle = card.oracle_text || card.oracleText || cardObj.oracle_text || cardObj.oracleText || card.text || cardObj.text || '';
  if (faces.length > 0) {
    const faceTexts = faces
      .map(f => f.oracle_text || f.oracleText || f.text || '')
      .filter(Boolean);
    if (faceTexts.length > 0) {
      if (!rootOracle) {
        rootOracle = faceTexts.join('\n//\n');
      } else {
        // Ensure back-face keywords (like Daybound/Nightbound triggers or transformed abilities) are included
        for (const ft of faceTexts) {
          if (!rootOracle.includes(ft)) {
            rootOracle = `${rootOracle}\n//\n${ft}`;
          }
        }
      }
    }
  }

  return rootOracle;
}

/**
 * Extracts combined canonical type line across all card faces.
 * 
 * @param {Object} card 
 * @returns {string}
 */
export function extractCanonicalTypeLine(card) {
  if (!card) return '';
  const cardObj = card.cardObj || card;
  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  let rootType = card.type_line || card.typeLine || cardObj.type_line || cardObj.typeLine || card.type || cardObj.type || '';
  if (!rootType && faces.length > 0) {
    rootType = faces.map(f => f.type_line || f.typeLine || f.type || '').filter(Boolean).join(' // ');
  }

  return rootType;
}

/**
 * Extracts canonical colors and color identity.
 * 
 * @param {Object} card 
 * @returns {{ colors: string[], colorIdentity: string[] }}
 */
export function extractCanonicalColors(card) {
  if (!card) return { colors: [], colorIdentity: [] };
  const cardObj = card.cardObj || card;
  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  const colorSet = new Set(
    Array.isArray(card.colors) ? card.colors : (Array.isArray(cardObj.colors) ? cardObj.colors : [])
  );
  for (const f of faces) {
    if (Array.isArray(f.colors)) {
      f.colors.forEach(c => colorSet.add(c));
    }
  }

  const idSet = new Set(
    Array.isArray(card.color_identity) ? card.color_identity : (Array.isArray(cardObj.color_identity) ? cardObj.color_identity : [])
  );

  return {
    colors: Array.from(colorSet),
    colorIdentity: Array.from(idSet)
  };
}

/**
 * Extracts canonical stats (power, toughness, keywords).
 * 
 * @param {Object} card 
 * @returns {{ power: number|null, toughness: number|null, keywords: string[] }}
 */
export function extractCanonicalStats(card) {
  if (!card) return { power: null, toughness: null, keywords: [] };
  const cardObj = card.cardObj || card;
  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  const rawPower = card.power ?? cardObj.power ?? faces[0]?.power ?? null;
  const rawToughness = card.toughness ?? cardObj.toughness ?? faces[0]?.toughness ?? null;

  const power = rawPower !== null && rawPower !== undefined ? (isNaN(Number(rawPower)) ? rawPower : Number(rawPower)) : null;
  const toughness = rawToughness !== null && rawToughness !== undefined ? (isNaN(Number(rawToughness)) ? rawToughness : Number(rawToughness)) : null;

  const kwSet = new Set([
    ...(Array.isArray(card.keywords) ? card.keywords : []),
    ...(Array.isArray(cardObj.keywords) ? cardObj.keywords : [])
  ]);
  for (const f of faces) {
    if (Array.isArray(f.keywords)) {
      f.keywords.forEach(k => kwSet.add(k));
    }
  }

  return {
    power,
    toughness,
    keywords: Array.from(kwSet)
  };
}

/**
 * Extracts canonical keywords across all card faces.
 * 
 * @param {Object} card 
 * @returns {string[]}
 */
export function extractCanonicalKeywords(card) {
  return extractCanonicalStats(card).keywords;
}

/**
 * Normalizes any card into an immutable CanonicalCard representation.
 * 
 * @param {Object} card 
 * @returns {Object} CanonicalCard
 */
export function normalizeCanonicalCard(card) {
  if (!card) return null;
  const cardObj = card.cardObj || card;

  const name = card.name || cardObj.name || 'Unknown';
  const manaValue = extractCanonicalCmc(card);
  const oracleText = extractCanonicalOracleText(card);
  const typeLine = extractCanonicalTypeLine(card);
  const { colors, colorIdentity } = extractCanonicalColors(card);
  const { power, toughness, keywords } = extractCanonicalStats(card);

  const faces = Array.isArray(cardObj.card_faces)
    ? cardObj.card_faces
    : (Array.isArray(card.card_faces) ? card.card_faces : []);

  const isTransform = faces.length > 1;
  const isLand = Boolean(
    typeLine.toLowerCase().includes('land') ||
    card.isLand ||
    cardObj.isLand ||
    card.role === 'Land' ||
    card.role === 'MANA_BASE'
  );

  // Extract structural creature types
  const structuralTypes = [];
  const typeParts = typeLine.split('—');
  if (typeParts.length > 1) {
    const subtypes = typeParts[1].split(/\s+/).map(s => s.trim().replace(/[/,;]/g, '')).filter(Boolean);
    structuralTypes.push(...subtypes);
  }

  // Derive mechanics present in oracle or keywords
  const mechanics = new Set(keywords.map(k => String(k).toUpperCase().replace(/[\s-]/g, '_')));
  const lowerOracle = oracleText.toLowerCase();
  if (lowerOracle.includes('daybound') || lowerOracle.includes('nightbound')) mechanics.add('DAYBOUND_NIGHTBOUND');
  if (lowerOracle.includes('transform')) mechanics.add('TRANSFORM');
  if (lowerOracle.includes('flying')) mechanics.add('FLYING');
  if (lowerOracle.includes('trample')) mechanics.add('TRAMPLE');
  if (lowerOracle.includes('menace')) mechanics.add('MENACE');
  if (lowerOracle.includes('haste')) mechanics.add('HASTE');
  if (lowerOracle.includes('first strike') || lowerOracle.includes('double strike')) mechanics.add('FIRST_STRIKE');

  // Subtype and mechanics extractors for distinct faces
  const extractSubtypes = (tl) => {
    if (!tl) return [];
    const parts = tl.split('—');
    if (parts.length > 1) {
      return parts[1].split(/\s+/).map(s => s.trim().replace(/[/,;]/g, '')).filter(Boolean);
    }
    return [];
  };

  const extractFaceMechanics = (text, kws = []) => {
    const mechs = new Set(kws.map(k => String(k).toUpperCase().replace(/[\s-]/g, '_')));
    const lower = (text || '').toLowerCase();
    if (lower.includes('daybound') || lower.includes('nightbound')) mechs.add('DAYBOUND_NIGHTBOUND');
    if (lower.includes('transform')) mechs.add('TRANSFORM');
    if (lower.includes('flying')) mechs.add('FLYING');
    if (lower.includes('trample')) mechs.add('TRAMPLE');
    if (lower.includes('menace')) mechs.add('MENACE');
    if (lower.includes('haste')) mechs.add('HASTE');
    if (lower.includes('first strike') || lower.includes('double strike')) mechs.add('FIRST_STRIKE');
    return Array.from(mechs);
  };

  const normalizedFaces = faces.map(f => Object.freeze({
    name: f.name || '',
    manaCost: f.mana_cost || '',
    manaValue: extractCanonicalCmc(f),
    cmc: extractCanonicalCmc(f),
    typeLine: f.type_line || '',
    oracleText: f.oracle_text || f.text || '',
    power: f.power !== undefined ? f.power : null,
    toughness: f.toughness !== undefined ? f.toughness : null,
    colors: Object.freeze([...(f.colors || [])]),
    structuralTypes: Object.freeze(extractSubtypes(f.type_line || '')),
    mechanics: Object.freeze(extractFaceMechanics(f.oracle_text || f.text || '', f.keywords || []))
  }));

  // 1. FRONT FACE (Casting face, initial zone transition from hand/library to stack/battlefield)
  const frontFace = Object.freeze({
    name: normalizedFaces[0]?.name || name,
    manaCost: normalizedFaces[0]?.manaCost || card.mana_cost || cardObj.mana_cost || '',
    manaValue: normalizedFaces[0]?.manaValue ?? manaValue,
    cmc: normalizedFaces[0]?.manaValue ?? manaValue,
    typeLine: normalizedFaces[0]?.typeLine || typeLine,
    oracleText: normalizedFaces[0]?.oracleText || (faces.length > 0 ? '' : oracleText),
    power: normalizedFaces[0]?.power !== undefined ? normalizedFaces[0].power : power,
    toughness: normalizedFaces[0]?.toughness !== undefined ? normalizedFaces[0].toughness : toughness,
    colors: normalizedFaces[0]?.colors || Object.freeze([...colors]),
    structuralTypes: normalizedFaces[0]?.structuralTypes || Object.freeze(extractSubtypes(typeLine)),
    mechanics: normalizedFaces[0]?.mechanics || Object.freeze(extractFaceMechanics(oracleText, keywords))
  });

  // 2. BACK FACE (Transformed state / payoff face, or null if single-faced)
  const backFace = normalizedFaces.length > 1 ? normalizedFaces[1] : null;

  // 3. EXECUTION FACE (Face relevant for casting, timing, T1/T2 curve eligibility)
  const executionFace = frontFace;

  // 4. CARD LEVEL (Holistic aggregate properties: whole card identities, mechanics across faces, color identity)
  const cardLevel = Object.freeze({
    name,
    manaValue,
    cmc: manaValue,
    typeLine,
    oracleText,
    colors: Object.freeze(colors),
    colorIdentity: Object.freeze(colorIdentity),
    structuralTypes: Object.freeze(structuralTypes),
    mechanics: Object.freeze(Array.from(mechanics)),
    isTransform,
    isLand
  });

  return Object.freeze({
    name,
    oracle_id: (card.oracle_id || cardObj.oracle_id || name).toLowerCase().trim(),
    manaValue,
    cmc: manaValue,
    frontManaValue: frontFace.manaValue,
    manaCost: card.mana_cost || cardObj.mana_cost || frontFace.manaCost || '',
    typeLine,
    oracleText,
    colors: Object.freeze(colors),
    colorIdentity: Object.freeze(colorIdentity),
    power: frontFace.power,
    toughness: frontFace.toughness,
    keywords: Object.freeze(keywords),
    structuralTypes: Object.freeze(structuralTypes),
    mechanics: Object.freeze(Array.from(mechanics)),
    isTransform,
    isLand,
    faces: Object.freeze(normalizedFaces),
    frontFace,
    backFace,
    executionFace,
    cardLevel,
    rawCard: cardObj
  });
}

/**
 * Returns the face relevant for casting and curve execution (frontFace).
 * @param {Object} card 
 * @returns {Object}
 */
export function getExecutionFace(card) {
  if (!card) return null;
  const canonical = card.executionFace ? card : normalizeCanonicalCard(card);
  return canonical?.executionFace || canonical;
}

/**
 * Returns the holistic card-level representation across all faces.
 * @param {Object} card 
 * @returns {Object}
 */
export function getCardLevel(card) {
  if (!card) return null;
  const canonical = card.cardLevel ? card : normalizeCanonicalCard(card);
  return canonical?.cardLevel || canonical;
}
