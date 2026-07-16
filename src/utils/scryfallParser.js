/**
 * Local Scryfall Syntax Parser for Magic: The Gathering
 * Evaluates MTG search queries against a card object locally.
 */

// 1. Tokenizador semántico de queries
function tokenizeQuery(query) {
  // Regex to capture:
  // Group 1: prefix with optional negation and operator (e.g. "t:", "-c>=", "cmc<=")
  // Group 2: quoted value (e.g. "draw a card")
  // Group 3: unquoted value (e.g. "creature")
  // Group 4: left parenthesis "("
  // Group 5: right parenthesis ")"
  const regex = /(-?\b\w+(?:>=|<=|>|<|:|!=|=))?(?:"([^"]*)"|([^\s()]+))|(\()|(\))/gi;
  let match;
  const tokens = [];

  while ((match = regex.exec(query)) !== null) {
    if (match[4]) {
      tokens.push({ type: 'LPAREN', value: '(' });
    } else if (match[5]) {
      tokens.push({ type: 'RPAREN', value: ')' });
    } else {
      const prefix = match[1] || '';
      const value = match[2] !== undefined ? match[2] : (match[3] || '');
      
      const lowerVal = value.toLowerCase();
      if (prefix === '' && lowerVal === 'or') {
        tokens.push({ type: 'OR', value: 'or' });
      } else if (prefix === '' && lowerVal === 'and') {
        tokens.push({ type: 'AND', value: 'and' });
      } else {
        tokens.push({ type: 'TERM', prefix, value });
      }
    }
  }
  return tokens;
}

// 2. Inserta AND implícitos entre términos contiguos (ej: "t:creature c:r" -> "t:creature AND c:r")
function insertImplicitAnds(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    result.push(current);
    
    if (i < tokens.length - 1) {
      const next = tokens[i + 1];
      
      const isCurrentOperand = current.type === 'TERM' || current.type === 'RPAREN';
      const isNextOperand = next.type === 'TERM' || next.type === 'LPAREN';
      
      if (isCurrentOperand && isNextOperand) {
        result.push({ type: 'AND', value: 'and', implicit: true });
      }
    }
  }
  return result;
}

// 3. Algoritmo Shunting-Yard para convertir a Notación Polaca Inversa (RPN)
function shuntingYard(tokens) {
  const outputQueue = [];
  const operatorStack = [];
  
  const precedence = {
    'AND': 2,
    'OR': 1
  };
  
  for (const token of tokens) {
    if (token.type === 'TERM') {
      outputQueue.push(token);
    } else if (token.type === 'AND' || token.type === 'OR') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== 'LPAREN' &&
        precedence[operatorStack[operatorStack.length - 1].type] >= precedence[token.type]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== 'LPAREN'
      ) {
        outputQueue.push(operatorStack.pop());
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'LPAREN') {
        operatorStack.pop(); // Remove LPAREN
      }
    }
  }
  
  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop());
  }
  
  return outputQueue;
}

// Comparación de colores de Scryfall
function compareColors(cardColors, queryVal, operator) {
  const cColors = (cardColors || []).map(c => c.toLowerCase());
  const qVal = queryVal.toLowerCase();
  
  if (qVal === 'c' || qVal === 'colorless') {
    if (operator === ':' || operator === '=') return cColors.length === 0;
    if (operator === '!=') return cColors.length > 0;
    return false;
  }
  if (qVal === 'multi' || qVal === 'multicolor' || qVal === 'multicolored') {
    if (operator === ':' || operator === '=') return cColors.length > 1;
    if (operator === '!=') return cColors.length <= 1;
    return false;
  }
  
  // Extraer letras de colores válidas
  const qLetters = Array.from(qVal).filter(char => 'wubrg'.includes(char));
  if (qLetters.length === 0) return false;
  
  if (operator === ':' || operator === '>=') {
    // Contiene al menos todos los colores solicitados
    return qLetters.every(l => cColors.includes(l));
  }
  if (operator === '=') {
    // Coincidencia exacta de colores
    if (cColors.length !== qLetters.length) return false;
    return qLetters.every(l => cColors.includes(l));
  }
  if (operator === '<=') {
    // Subconjunto: la carta no puede tener colores fuera de los solicitados
    return cColors.every(l => qLetters.includes(l));
  }
  if (operator === '>') {
    // Contiene todos los colores y al menos uno más
    return qLetters.every(l => cColors.includes(l)) && cColors.length > qLetters.length;
  }
  if (operator === '<') {
    // Subconjunto estricto
    return cColors.every(l => qLetters.includes(l)) && cColors.length < qLetters.length;
  }
  if (operator === '!=') {
    // No es exactamente igual
    const isExact = cColors.length === qLetters.length && qLetters.every(l => cColors.includes(l));
    return !isExact;
  }
  return false;
}

// Comparación numérica genérica
function compareNumeric(cardVal, queryVal, operator) {
  if (operator === '=' || operator === ':') return cardVal === queryVal;
  if (operator === '>=') return cardVal >= queryVal;
  if (operator === '<=') return cardVal <= queryVal;
  if (operator === '>') return cardVal > queryVal;
  if (operator === '<') return cardVal < queryVal;
  if (operator === '!=') return cardVal !== queryVal;
  return false;
}

// Comparación jerárquica de rareza
function compareRarity(cardRarity, queryRarity, operator) {
  const rarityScale = {
    common: 1,
    uncommon: 2,
    rare: 3,
    mythic: 4,
    special: 3,
    bonus: 3
  };
  
  const cVal = (cardRarity || '').toLowerCase();
  const qVal = queryRarity.toLowerCase();
  
  const cScore = rarityScale[cVal] || 1;
  const qScore = rarityScale[qVal] || 0;
  
  if (operator === '=' || operator === ':') return cVal === qVal;
  if (operator === '>=') return cScore >= qScore;
  if (operator === '<=') return cScore <= qScore;
  if (operator === '>') return cScore > qScore;
  if (operator === '<') return cScore < qScore;
  if (operator === '!=') return cVal !== qVal;
  return false;
}

// Comprobación de atajos e is/not
function checkShortcut(card, shortcut) {
  const typeLine = (card.type_line || '').toLowerCase();
  
  switch (shortcut) {
    case 'spell':
      return !typeLine.includes('land');
    case 'permanent':
      return !typeLine.includes('instant') && !typeLine.includes('sorcery');
    case 'creature':
      return typeLine.includes('creature');
    case 'instant':
      return typeLine.includes('instant');
    case 'sorcery':
      return typeLine.includes('sorcery');
    case 'land':
      return typeLine.includes('land');
    case 'artifact':
      return typeLine.includes('artifact');
    case 'enchantment':
      return typeLine.includes('enchantment');
    case 'planeswalker':
      return typeLine.includes('planeswalker');
    case 'promo':
      return !!(card.promo_types && card.promo_types.length > 0);
    case 'multicolor':
    case 'multicolored':
      return !!(card.colors && card.colors.length > 1);
    case 'monocolor':
    case 'monocolored':
      return !!(card.colors && card.colors.length === 1);
    case 'colorless':
      return !(card.colors && card.colors.length > 0);
    case 'vanilla':
      // Sin texto de reglas (excluyendo flavor text si existiese o tags)
      return !(card.oracle_text || '').trim();
    default:
      return false;
  }
}

// Evalúa un término individual contra la carta
function matchSingleTerm(card, token, cachedOracleTags) {
  let isNegated = false;
  let prefix = token.prefix.toLowerCase();
  
  if (prefix.startsWith('-')) {
    isNegated = true;
    prefix = prefix.slice(1);
  } else if (prefix.startsWith('!')) {
    isNegated = true;
    prefix = prefix.slice(1);
  }
  
  const opMatch = prefix.match(/^(\w+)(>=|<=|>|<|:|!=|=)$/);
  const field = opMatch ? opMatch[1] : '';
  const op = opMatch ? opMatch[2] : '';
  const val = token.value.toLowerCase();
  
  const cardName = (card.name || '').toLowerCase();
  const typeLine = (card.type_line || '').toLowerCase();
  const oracleText = (card.oracle_text || '').toLowerCase();
  
  let matches = false;
  let wasHandled = true;
  
  switch (field) {
    case '': // Búsqueda general (sin prefijo)
      matches = cardName.includes(val) || typeLine.includes(val) || oracleText.includes(val);
      break;
      
    case 't':
    case 'type':
      matches = typeLine.includes(val);
      break;
      
    case 'o':
    case 'oracle':
      matches = oracleText.includes(val);
      break;
      
    case 'c':
    case 'color':
    case 'colors':
      matches = compareColors(card.colors, val, op);
      break;
      
    case 'id':
    case 'identity':
    case 'ci':
      matches = compareColors(card.color_identity, val, op);
      break;
      
    case 'cmc':
    case 'mv':
    case 'mana':
      const cardMv = card.mana_value ?? card.cmc ?? 0;
      matches = compareNumeric(cardMv, parseFloat(val), op);
      break;
      
    case 'pow':
    case 'power':
    case 'tou':
    case 'toughness':
      const isPower = field.startsWith('pow');
      const cardStr = isPower ? card.power : card.toughness;
      if (cardStr === undefined || cardStr === null) {
        matches = false;
      } else {
        const cardNum = parseFloat(cardStr);
        const queryNum = parseFloat(val);
        if (isNaN(cardNum) || isNaN(queryNum)) {
          // Comparación exacta de strings para estrellas (*)
          matches = (op === '=' || op === ':') ? (cardStr.toLowerCase() === val) : false;
        } else {
          matches = compareNumeric(cardNum, queryNum, op);
        }
      }
      break;
      
    case 'r':
    case 'rarity':
      matches = compareRarity(card.rarity, val, op);
      break;
      
    case 's':
    case 'set':
    case 'e':
    case 'edition':
      matches = (card.set || '').toLowerCase() === val;
      break;
      
    case 'f':
    case 'format':
      matches = !!(card.legalities && card.legalities[val] === 'legal');
      break;
      
    case 'is':
    case 'not':
      const shortcutResult = checkShortcut(card, val);
      matches = (field === 'not') ? !shortcutResult : shortcutResult;
      break;
      
    case 'function':
    case 'otag':
    case 'oracletag':
    case 'oracle_tags':
    case 'oracle_tag':
      const officialTags = cachedOracleTags?.[cardName] || card.oracle_tags || [];
      if (officialTags.includes(val)) {
        matches = true;
      } else {
        // Fallbacks locales para tags de funcionalidad básicos
        if (val === 'removal') {
          matches = oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('damage') || typeLine.includes('removal');
        } else if (val === 'board-wipe') {
          matches = oracleText.includes('destroy all') || oracleText.includes('exile all') || oracleText.includes('board wipe');
        } else if (val === 'draw') {
          matches = oracleText.includes('draw a card') || oracleText.includes('draw two cards') || oracleText.includes('look at the top') || oracleText.includes('scry');
        } else if (val === 'ramp') {
          matches = oracleText.includes('add ') || oracleText.includes('search your library for a land');
        } else if (val === 'counterspell') {
          matches = oracleText.includes('counter target');
        } else {
          matches = false;
        }
      }
      break;
      
    default:
      wasHandled = false; // Prefijo no soportado
  }
  
  if (!wasHandled) {
    // Fallback defensivo: revertir a una búsqueda genérica usando el valor únicamente
    matches = cardName.includes(val) || typeLine.includes(val) || oracleText.includes(val);
  }
  
  return isNegated ? !matches : matches;
}

/**
 * Evalúa si una carta cumple con una consulta de sintaxis Scryfall localmente.
 * @param {Object} card Objeto de la carta con propiedades de IndexedDB.
 * @param {string} query Consulta en formato de Scryfall (ej: "(c:r or c:g) cmc<=2 t:instant").
 * @param {Object} [cachedOracleTags] Diccionario opcional de cardName -> [tags].
 * @returns {boolean} True si la carta coincide con la consulta.
 */
export function matchesScryfallQuery(card, query, cachedOracleTags = null) {
  if (!query || !query.trim()) return true;
  
  try {
    const rawTokens = tokenizeQuery(query);
    if (rawTokens.length === 0) return true;
    
    const tokens = insertImplicitAnds(rawTokens);
    const rpn = shuntingYard(tokens);
    
    const stack = [];
    
    for (const token of rpn) {
      if (token.type === 'TERM') {
        const res = matchSingleTerm(card, token, cachedOracleTags);
        stack.push(res);
      } else if (token.type === 'AND') {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a && b);
      } else if (token.type === 'OR') {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a || b);
      }
    }
    
    return stack.length > 0 ? stack[0] : false;
  } catch (err) {
    // Si falla el parser por cualquier motivo, revertir defensivamente a búsqueda simple de subcadena
    console.warn(`⚠️ [Scryfall Parser Error] "${query}" falló. Usando fallback de subcadena.`, err);
    const cleanQuery = query.toLowerCase().trim();
    const cardName = (card.name || '').toLowerCase();
    const typeLine = (card.type_line || '').toLowerCase();
    const oracleText = (card.oracle_text || '').toLowerCase();
    return cardName.includes(cleanQuery) || typeLine.includes(cleanQuery) || oracleText.includes(cleanQuery);
  }
}
