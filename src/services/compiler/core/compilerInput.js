/**
 * src/services/compiler/core/compilerInput.js
 * 
 * CompilerInput Container v1.0.
 * Retains 3 distinct traceable levels of compilation input:
 *   1. rawPrompt: Exact string typed by the user.
 *   2. uiState: Untouched React UI Form State object.
 *   3. intentPackage: Immutable IntentPackage SSOT domain object.
 */

import { IntentBuilder } from './intentBuilder.js';

export class CompilerInput {
  constructor({ rawPrompt = '', uiState = {}, intentPackage = null } = {}) {
    this.rawPrompt = rawPrompt || (uiState && uiState.prompt) || '';
    this.uiState = Object.freeze({ ...uiState });
    this.intentPackage = intentPackage || IntentBuilder.buildFromUI(uiState);
    
    Object.freeze(this);
  }

  static createFromUI(uiState, rawPrompt = '') {
    return new CompilerInput({
      rawPrompt,
      uiState,
      intentPackage: IntentBuilder.buildFromUI(uiState)
    });
  }

  toJSON() {
    return {
      rawPrompt: this.rawPrompt,
      uiState: this.uiState,
      intentPackage: this.intentPackage.toJSON()
    };
  }
}
