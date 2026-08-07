/**
 * src/services/compiler/core/compilerVersion.js
 * 
 * Centralización de versiones de compilador, plugins, oracle y contratos.
 * Permite reproducibilidad y comparativa de telemetría determinista.
 */

export const COMPILER_VERSION = Object.freeze({
  compiler: '13.1.0',
  plugins: 'MTG_2026.08',
  oracle: 'Scryfall_2026.08',
  contracts: '1.0.0',
  buildId: 'BUILD_v13_GRANDMASTER'
});
