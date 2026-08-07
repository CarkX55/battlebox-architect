/**
 * src/services/compiler/core/pureGameState.js
 * 
 * PureGameState: Estructura de Datos Pura Inmutable para el Core del Compilador.
 * NO contiene métodos de estado en su clase.
 * Las transiciones se realizan mediante funciones reductoras puras: (state, action) => newState.
 * Permite instant rollback, paralelismo MCTS, memoización y caché determinista.
 */

/**
 * Crea una estructura de datos inmutable pura del estado del juego
 */
export function createPureGameState(initialData = {}) {
  const turn = Number(initialData.turn || 1);
  return Object.freeze({
    turn,
    phase: initialData.phase || 'MAIN_1',
    resources: Object.freeze({
      manaAvailable: Number(initialData.resources?.manaAvailable ?? turn),
      dorksActive: Number(initialData.resources?.dorksActive || 0),
      rocksActive: Number(initialData.resources?.rocksActive || 0),
      floatingMana: Object.freeze({ ...(initialData.resources?.floatingMana || {}) })
    }),
    boardState: Object.freeze({
      creatures: Object.freeze([...(initialData.boardState?.creatures || [])]),
      totalPower: Number(initialData.boardState?.totalPower || 0),
      totalToughness: Number(initialData.boardState?.totalToughness || 0),
      permanentsCount: Number(initialData.boardState?.permanentsCount || 0)
    }),
    hand: Object.freeze({
      cardsInHand: Math.max(0, Number(initialData.hand?.cardsInHand ?? (7 - turn + 1))),
      spellsCount: Number(initialData.hand?.spellsCount || 4),
      landsCount: Number(initialData.hand?.landsCount || 3)
    }),
    graveyard: Object.freeze({
      count: Number(initialData.graveyard?.count || 0),
      cards: Object.freeze([...(initialData.graveyard?.cards || [])])
    }),
    stack: Object.freeze([...(initialData.stack || [])]),
    priority: initialData.priority || 'PLAYER',
    beliefState: Object.freeze({
      opponentCounterspellProb: Number(initialData.beliefState?.opponentCounterspellProb ?? 0.40),
      opponentWrathProb: Number(initialData.beliefState?.opponentWrathProb ?? 0.25),
      opponentBoltProb: Number(initialData.beliefState?.opponentBoltProb ?? 0.18)
    }),
    capabilityStatus: Object.freeze({ ...(initialData.capabilityStatus || {}) })
  });
}

/**
 * Función Reductora Pura de Transición: (state, action) -> newState
 */
export function reducePureGameState(state, action = {}) {
  if (!state) throw new Error('[reducePureGameState Error] state es requerido.');
  if (!action.type) return state;

  switch (action.type) {
    case 'PASS_TURN': {
      const nextTurn = state.turn + 1;
      return Object.freeze({
        ...state,
        turn: nextTurn,
        resources: Object.freeze({
          ...state.resources,
          manaAvailable: nextTurn + state.resources.dorksActive
        }),
        hand: Object.freeze({
          ...state.hand,
          cardsInHand: state.hand.cardsInHand + 1
        })
      });
    }

    case 'PLAY_DORK': {
      const cardPower = Number(action.cardPower || 1);
      return Object.freeze({
        ...state,
        resources: Object.freeze({
          ...state.resources,
          dorksActive: state.resources.dorksActive + 1
        }),
        boardState: Object.freeze({
          ...state.boardState,
          creatures: Object.freeze([...state.boardState.creatures, action.cardName || 'Dork']),
          totalPower: state.boardState.totalPower + cardPower,
          permanentsCount: state.boardState.permanentsCount + 1
        })
      });
    }

    case 'PLAY_CREATURE': {
      const cardPower = Number(action.cardPower || 2);
      const cardToughness = Number(action.cardToughness || 2);
      return Object.freeze({
        ...state,
        boardState: Object.freeze({
          ...state.boardState,
          creatures: Object.freeze([...state.boardState.creatures, action.cardName || 'Creature']),
          totalPower: state.boardState.totalPower + cardPower,
          totalToughness: state.boardState.totalToughness + cardToughness,
          permanentsCount: state.boardState.permanentsCount + 1
        })
      });
    }

    case 'APPLY_WRATH': {
      return Object.freeze({
        ...state,
        boardState: Object.freeze({
          creatures: Object.freeze([]),
          totalPower: 0,
          totalToughness: 0,
          permanentsCount: 0
        }),
        graveyard: Object.freeze({
          count: state.graveyard.count + state.boardState.creatures.length,
          cards: Object.freeze([...state.graveyard.cards, ...state.boardState.creatures])
        })
      });
    }

    default:
      return state;
  }
}
