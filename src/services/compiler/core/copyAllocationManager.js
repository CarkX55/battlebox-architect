/**
 * src/services/compiler/core/copyAllocationManager.js
 * 
 * CopyAllocationManager: Autoridad Única sobre Multiplicidad y Asignación de Copias v23.0.
 * 
 * SINGLE AUTHORITY for all copy-count decisions in the entire pipeline.
 * No other component may create, modify, or override copy quantities.
 * 
 * Four-level flow:
 *   1. CapabilityRequirements (what the deck needs — no cards, no counts)
 *   2. CapabilityPackages (which cards, how many copies, lock level)
 *   3. CopyAllocationState (verified allocation snapshot for UI display)
 *   4. DeckExpansion (physical slot reservation — replicates, never invents quantities)
 * 
 * Flujo en 3 Fases Internas:
 *   1. Density Allocation (¿Cuánta densidad requiere el rol?)
 *   2. Winner Selection (¿Cuáles son las mejores cartas proveedoras?)
 *   3. Copy Allocation (¿Cuántas copias asignar a cada carta?)
 */

import { CapabilityPackage, LockLevel, PackagePriority } from './capabilityPackage.js';
import { CapabilityRequirement, CapabilityImportance, resolveAllocationMode } from './capabilityRequirement.js';
import { MarginalCopyEvaluator } from './marginalCopyEvaluator.js';

/**
 * CopyAllocationState: Immutable verified snapshot of all allocation decisions.
 * This is what the BlueprintEditor renders to prove the system is governing.
 */
export class CopyAllocationState {
  constructor({ packages = [], mode = 'PRIORITIZE_4X', modeSource = 'FORMAT_POLICY', format = 'MODERN', timestamp = null }) {
    this.packages = Object.freeze([...packages]);
    this.mode = mode;
    this.modeSource = modeSource;
    this.format = format;
    this.timestamp = timestamp || new Date().toISOString();
    this.totalAllocatedDensity = packages.reduce((sum, p) => sum + p.allocatedDensity, 0);
    this.totalDesiredCopies = packages.reduce((sum, p) => sum + p.copies, 0);
    this.allVerified = packages.every(p => p.allocatedDensity >= (p.requiredDensity * 0.75));

    Object.freeze(this);
  }

  /**
   * Returns a structured summary for each package, ready for UI rendering.
   */
  getPackageSummaries() {
    return this.packages.map(pkg => ({
      role: pkg.role,
      winnerCard: pkg.winnerCard,
      requiredDensity: pkg.requiredDensity,
      allocatedDensity: pkg.allocatedDensity,
      desiredCopies: pkg.copies,
      lockLevel: pkg.lockLevel,
      priority: pkg.priority,
      rationale: pkg.rationale,
      verified: pkg.allocatedDensity >= pkg.requiredDensity,
      densityGap: pkg.requiredDensity - pkg.allocatedDensity,
      status: pkg.allocatedDensity >= pkg.requiredDensity ? 'VERIFIED' :
              pkg.allocatedDensity >= (pkg.requiredDensity * 0.75) ? 'PARTIAL' : 'FAILED'
    }));
  }
}


export class CopyAllocationManager {
  /**
   * Converts filled AllocationSlots from CandidateConstraintEngine into a verified CopyAllocationState.
   * This is the SINGLE AUTHORITY for copy multiplicities and deck size closure.
   * 
   * @param {Array<import('./capabilityPlan.js').AllocationSlot>} filledSlots
   * @param {string} format
   * @param {string|null} userModeOverride
   * @param {Object} intentPackage
   * @param {Array<Object>} cardPool
   * @param {Object} deckIdentity
   * @returns {CopyAllocationState}
   */
  static createAllocationStateFromPlan(filledSlots = [], format = 'STANDARD', userModeOverride = null, intentPackage = {}, cardPool = [], deckIdentity = null) {
    const { mode, source } = resolveAllocationMode(format, userModeOverride);
    const fmt = (format || 'MODERN').toUpperCase();
    const isSingleton = fmt === 'COMMANDER' || fmt === 'EDH' || fmt === 'BRAWL' || fmt === 'SINGLETON' || mode === 'SINGLETON';
    const totalDeckTarget = isSingleton ? 100 : (intentPackage.deckSize || 60);

    const landSlots = filledSlots.filter(s => s.role === 'Land' || (s.role || '').toLowerCase().includes('mana_base'));
    const spellSlots = filledSlots.filter(s => s.role !== 'Land' && !(s.role || '').toLowerCase().includes('mana_base'));

    const landTargetCount = landSlots.reduce((sum, s) => sum + (s.requiredDensity || 0), 0) || 24;
    const targetSpellCount = totalDeckTarget - landTargetCount; // e.g. 36 for standard 60-card deck

    const runningDeckState = { cards: [] };
    const strategicContract = {
      archetype: intentPackage?.strategicTempo || 'MIDRANGE',
      winPath: intentPackage?.winPath || [],
      proofObligations: deckIdentity?.requiredEngines || [],
      format: fmt,
      constraints: intentPackage?.userConstraints || {}
    };

    // 1. Initial Marginal Copy Allocation for Spells
    const rawAllocations = [];
    for (const slot of spellSlots) {
      const cardObj = slot.winnerCardObj || { name: slot.winnerCard, cmc: 2 };
      
      let optimalCopies;
      if (isSingleton) {
        optimalCopies = 1;
      } else {
        const evalResult = MarginalCopyEvaluator.evaluateOptimalCopies(cardObj, runningDeckState, strategicContract);
        optimalCopies = evalResult.optimalCopies;
        if (mode === 'PRIORITIZE_4X' && !(cardObj.type_line || cardObj.type || '').includes('Legendary') && Number(cardObj.cmc || 0) <= 2) {
          optimalCopies = Math.max(optimalCopies, 4);
        }
      }

      rawAllocations.push({
        slot,
        cardObj,
        cardName: slot.winnerCard,
        copies: optimalCopies,
        maxLegal: MarginalCopyEvaluator.getCopyDomain(cardObj, fmt).max
      });

      // Update running deck state for redundancy calculation
      runningDeckState.cards.push({ card: cardObj, count: optimalCopies, quantity: optimalCopies });
    }

    // 2. Causal Expansion Loop to achieve exact targetSpellCount (e.g. 36 spells)
    let currentSpellTotal = rawAllocations.reduce((sum, a) => sum + a.copies, 0);

    if (!isSingleton && currentSpellTotal < targetSpellCount) {
      // Loop: increase copies on best non-legendary, low CMC, high marginal utility cards first
      let progress = true;
      while (currentSpellTotal < targetSpellCount && progress) {
        progress = false;
        
        let bestCandidate = null;
        let bestGain = -Infinity;

        for (const alloc of rawAllocations) {
          if (alloc.copies < alloc.maxLegal) {
            const isLeg = (alloc.cardObj.type_line || alloc.cardObj.type || '').includes('Legendary');
            const cmc = Number(alloc.cardObj.cmc || 0);
            
            // Do not force 4x on legendary cards if avoidable
            if (isLeg && alloc.copies >= 2) continue;

            const nextCopyGain = (alloc.maxLegal - alloc.copies) * 0.5 - (cmc * 0.1) - (isLeg ? 1.0 : 0);
            if (nextCopyGain > bestGain) {
              bestGain = nextCopyGain;
              bestCandidate = alloc;
            }
          }
        }

        if (bestCandidate) {
          bestCandidate.copies += 1;
          currentSpellTotal += 1;
          progress = true;
        } else {
          // If all current primary slots are at marginal saturation, check proven slot alternatives
          for (const alloc of rawAllocations) {
            if (currentSpellTotal >= targetSpellCount) break;
            const alts = alloc.slot.alternatives || [];
            for (const altName of alts) {
              if (currentSpellTotal >= targetSpellCount) break;
              if (!rawAllocations.some(a => a.cardName === altName)) {
                const altCardObj = (cardPool || []).find(c => c.name === altName) || { name: altName, cmc: 2 };
                const copiesToAdd = Math.min(2, targetSpellCount - currentSpellTotal);
                rawAllocations.push({
                  slot: alloc.slot,
                  cardObj: altCardObj,
                  cardName: altName,
                  copies: copiesToAdd,
                  maxLegal: 4,
                  isExpandedAlternative: true
                });
                currentSpellTotal += copiesToAdd;
                progress = true;
                break;
              }
            }
          }

          // If no alternatives exist, raise existing non-legendary allocations up to maxLegal
          if (!progress) {
            for (const alloc of rawAllocations) {
              const isLeg = (alloc.cardObj.type_line || alloc.cardObj.type || '').includes('Legendary');
              if (alloc.copies < alloc.maxLegal && !isLeg) {
                alloc.copies += 1;
                currentSpellTotal += 1;
                progress = true;
                break;
              }
            }
          }
        }
      }
    } else if (!isSingleton && currentSpellTotal > targetSpellCount) {
      // Trim excess copies from highest CMC / legendary slots first
      while (currentSpellTotal > targetSpellCount) {
        let worstCandidate = null;
        let worstScore = Infinity;

        for (const alloc of rawAllocations) {
          if (alloc.copies > 1) {
            const isLeg = (alloc.cardObj.type_line || alloc.cardObj.type || '').includes('Legendary');
            const cmc = Number(alloc.cardObj.cmc || 0);
            const score = (isLeg ? -2 : 0) - cmc + (4 - alloc.copies);
            if (score < worstScore) {
              worstScore = score;
              worstCandidate = alloc;
            }
          }
        }

        if (worstCandidate) {
          worstCandidate.copies -= 1;
          currentSpellTotal -= 1;
        } else {
          break;
        }
      }
    }

    // 3. Assemble final packages
    const packages = [];

    // Land packages
    for (const slot of landSlots) {
      packages.push(new CapabilityPackage({
        role: slot.role,
        requiredDensity: slot.requiredDensity,
        allocatedDensity: slot.requiredDensity,
        winnerCard: slot.winnerCard,
        winnerCardObj: slot.winnerCardObj || null,
        copies: slot.requiredDensity,
        alternatives: slot.alternatives || [],
        priority: PackagePriority.PRIORITY_1_CORE,
        lockLevel: LockLevel.LOCK_HARD,
        rationale: slot.allocationReason || `Mana base: ${slot.requiredDensity} lands allocated`
      }));
    }

    // Spell packages
    for (const alloc of rawAllocations) {
      const slot = alloc.slot;
      const priority = slot.priority >= 90 ? PackagePriority.PRIORITY_1_CORE : PackagePriority.PRIORITY_2_SUPPORT;
      const lockLevel = slot.mandatory ? LockLevel.LOCK_HARD : LockLevel.LOCK_SOFT;

      packages.push(new CapabilityPackage({
        role: alloc.isExpandedAlternative ? `SUPPORT_${slot.role}` : slot.role,
        requiredDensity: alloc.copies,
        allocatedDensity: alloc.copies,
        winnerCard: alloc.cardName,
        winnerCardObj: alloc.cardObj,
        copies: alloc.copies,
        alternatives: slot.alternatives || [],
        priority,
        lockLevel,
        rationale: alloc.isExpandedAlternative
          ? `Causal Expansion: Added ${alloc.copies}x "${alloc.cardName}" to close deck size (36 spells)`
          : `MarginalCopyEvaluator: Allocated ${alloc.copies}x "${alloc.cardName}" based on marginal state gain`
      }));
    }

    return new CopyAllocationState({
      packages,
      mode,
      modeSource: source,
      format: fmt
    });
  }

  /**
   * Creates a verified CopyAllocationState directly from a compiled DeckState.
   * Ensures 100% single-source-of-truth alignment between ProgressiveDeckStateBuilder
   * and explanatory UI/Auditor representations.
   * 
   * @param {import('./deckState.js').DeckState} deckState
   * @param {string} format
   * @param {Object} intentPackage
   * @param {Object} deckIdentity
   * @returns {CopyAllocationState}
   */
  static createAllocationStateFromDeckState(deckState, format = 'MODERN', intentPackage = {}, deckIdentity = {}) {
    const cards = deckState?.cards || [];
    const packages = [];
    const fmt = (typeof format === 'string' && format) ? format.toUpperCase() : (intentPackage?.format ? String(intentPackage.format).toUpperCase() : 'MODERN');
    const mode = resolveAllocationMode(fmt, intentPackage?.userConstraints?.allocationMode || null);

    for (const entry of cards) {
      const cardObj = entry.cardObj || entry;
      const isLand = Boolean(entry.isLand || (entry.type_line || '').toLowerCase().includes('land') || entry.role === 'Land');
      const copies = Number(entry.quantity || entry.count || 1);
      const role = entry.role || (isLand ? 'Land' : 'CORE_SYNERGY');
      const priority = isLand ? PackagePriority.PRIORITY_1_CORE : (entry.packagePriority === 'CORE' ? PackagePriority.PRIORITY_1_CORE : PackagePriority.PRIORITY_2_SUPPORT);
      const lockLevel = entry.lockLevel || (isLand ? LockLevel.LOCK_HARD : LockLevel.LOCK_SOFT);

      packages.push(new CapabilityPackage({
        role,
        requiredDensity: copies,
        allocatedDensity: copies,
        winnerCard: entry.name,
        winnerCardObj: cardObj,
        copies,
        alternatives: [],
        priority,
        lockLevel,
        rationale: isLand
          ? `Mana base: ${copies}x "${entry.name}" allocated by Frank Karsten engine`
          : `Progressive State Optimizer: Allocated ${copies}x "${entry.name}" based on marginal state gain`
      }));
    }

    return new CopyAllocationState({
      packages,
      mode: mode.mode,
      modeSource: mode.source,
      format: fmt
    });
  }
  /**
   * Derives CapabilityRequirements from strategy competition results and archetype.
   * Bridges PASS 1 (Strategy Competition) → PASS 4 (Package Composition).
   * 
   * @param {Object} strategyCompetition - Output from StrategyCompetitionEngine
   * @param {string} archetype - Deck archetype (e.g., 'Ramp', 'Merfolk Tempo')
   * @param {string} format - Format (e.g., 'MODERN', 'COMMANDER')
   * @returns {CapabilityRequirement[]} Array of requirements
   */
  static deriveRequirementsFromStrategy(strategyCompetition, archetype = 'Ramp', format = 'MODERN') {
    const archetypeLower = (archetype || '').toLowerCase();
    const isCommander = format.toUpperCase() === 'COMMANDER';
    const totalDeckSize = isCommander ? 100 : 60;

    // Base requirements that every deck needs
    const requirements = [];

    // Archetype-specific capability requirements
    if (archetypeLower.includes('merfolk') || archetypeLower.includes('tempo')) {
      requirements.push(
        new CapabilityRequirement({
          capability: 'FREE_DEPLOYMENT',
          targetDensity: 4,
          minDensity: 4,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['ARTIFACT', 'CMC1'],
          role: 'Free Deployment',
          rationale: 'Aether Vial enables flash-speed creature deployment, bypassing mana constraints'
        }),
        new CapabilityRequirement({
          capability: 'TRIBAL_LORD_ENGINE',
          targetDensity: 12,
          minDensity: 8,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['CREATURE', 'MERFOLK', 'STATIC_BUFF'],
          role: 'Lords',
          rationale: 'Critical mass of lords creates exponential power scaling'
        }),
        new CapabilityRequirement({
          capability: 'CARD_FLOW',
          targetDensity: 6,
          minDensity: 4,
          importance: CapabilityImportance.HIGH,
          preferredCharacteristics: ['CREATURE', 'MERFOLK', 'ETB_DRAW'],
          role: 'Card Flow',
          rationale: 'Card advantage engine to sustain pressure through midgame'
        }),
        new CapabilityRequirement({
          capability: 'EVASION_FINISHER',
          targetDensity: 4,
          minDensity: 2,
          importance: CapabilityImportance.HIGH,
          preferredCharacteristics: ['CREATURE', 'MERFOLK', 'ISLANDWALK'],
          role: 'Threat',
          rationale: 'Evasive threats that convert board presence into lethal damage'
        }),
        new CapabilityRequirement({
          capability: 'COUNTER_TEMPO',
          targetDensity: 8,
          minDensity: 4,
          importance: CapabilityImportance.HIGH,
          preferredCharacteristics: ['INSTANT', 'COUNTERSPELL'],
          role: 'Removal',
          rationale: 'Counter-tempo protection for critical turns'
        }),
        new CapabilityRequirement({
          capability: 'MANA_BASE',
          targetDensity: 26,
          minDensity: 22,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['LAND', 'BLUE'],
          role: 'Land',
          rationale: `Mana base for ${totalDeckSize}-card ${format} deck`
        })
      );
    } else {
      // Default Ramp / Midrange archetype
      requirements.push(
        new CapabilityRequirement({
          capability: 'TURN_1_ACCELERATION',
          targetDensity: 10,
          minDensity: 8,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['CREATURE', 'GREEN', 'CMC1', 'MANA_DORK'],
          role: 'Ramp',
          rationale: 'T1 mana acceleration is the primary engine — reach 6 mana by T4'
        }),
        new CapabilityRequirement({
          capability: 'CARD_ADVANTAGE',
          targetDensity: 8,
          minDensity: 6,
          importance: CapabilityImportance.HIGH,
          preferredCharacteristics: ['DRAW_CARDS', 'CANTRIP'],
          role: 'Draw',
          rationale: 'Resource flow to sustain through midgame and recover from interaction'
        }),
        new CapabilityRequirement({
          capability: 'INTERACTION',
          targetDensity: 6,
          minDensity: 4,
          importance: CapabilityImportance.HIGH,
          preferredCharacteristics: ['INSTANT', 'SORCERY', 'DESTROY', 'EXILE'],
          role: 'Removal',
          rationale: 'Answers to opposing threats; insufficient removal = losing to any resolved threat'
        }),
        new CapabilityRequirement({
          capability: 'THREAT_MASS',
          targetDensity: 12,
          minDensity: 8,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['CREATURE', 'HIGH_POWER', 'ETB_VALUE'],
          role: 'Threat',
          rationale: 'Payoff threats that convert mana advantage into board dominance'
        }),
        new CapabilityRequirement({
          capability: 'MANA_BASE',
          targetDensity: 24,
          minDensity: 22,
          importance: CapabilityImportance.CORE,
          preferredCharacteristics: ['LAND'],
          role: 'Land',
          rationale: `Karsten-optimal mana base for avg CMC ~2.4 with 10 virtual mana sources`
        })
      );
    }

    return Object.freeze(requirements);
  }

  /**
   * Generates CapabilityPackages from CapabilityRequirements respecting allocation mode.
   * This is the SINGLE AUTHORITY for all copy-count decisions.
   * 
   * @param {CapabilityRequirement[]} requirements - From deriveRequirementsFromStrategy()
   * @param {string} mode - Allocation mode ('PRIORITIZE_4X', 'SINGLETON', 'BALANCED')
   * @returns {CapabilityPackage[]} Frozen array of allocated packages
   */
  static allocatePackages(requirements = [], mode = 'PRIORITIZE_4X') {
    const packages = [];

    requirements.forEach(req => {
      const role = req.capability || req.role || 'GENERAL_ROLE';
      const requiredDensity = req.targetDensity || 8;
      const importance = req.importance || CapabilityImportance.SUPPORT;

      // Map importance to PackagePriority
      let priority;
      switch (importance) {
        case CapabilityImportance.CORE:
          priority = PackagePriority.PRIORITY_1_CORE;
          break;
        case CapabilityImportance.HIGH:
          priority = PackagePriority.PRIORITY_2_SUPPORT;
          break;
        case CapabilityImportance.SILVER_BULLET:
          priority = PackagePriority.PRIORITY_3_SILVER_BULLET;
          break;
        case CapabilityImportance.FLEX:
          priority = PackagePriority.PRIORITY_4_TUTOR_TARGET;
          break;
        default:
          priority = PackagePriority.PRIORITY_2_SUPPORT;
      }

      // Determine copies and lock level from mode + priority
      let copies, lockLevel;

      if (mode === 'SINGLETON') {
        copies = 1;
        lockLevel = LockLevel.FLEXIBLE;
      } else if (priority === PackagePriority.PRIORITY_3_SILVER_BULLET || priority === PackagePriority.PRIORITY_4_TUTOR_TARGET) {
        copies = 1;
        lockLevel = LockLevel.FLEXIBLE;
      } else if (mode === 'PRIORITIZE_4X' && priority === PackagePriority.PRIORITY_1_CORE) {
        copies = 4;
        lockLevel = LockLevel.LOCK_HARD;
      } else if (mode === 'PRIORITIZE_4X' && priority === PackagePriority.PRIORITY_2_SUPPORT) {
        copies = 4;
        lockLevel = LockLevel.LOCK_SOFT;
      } else if (mode === 'BALANCED') {
        copies = 3;
        lockLevel = LockLevel.LOCK_SOFT;
      } else {
        copies = 4;
        lockLevel = LockLevel.LOCK_SOFT;
      }

      // Calculate how many distinct cards needed to fill the required density
      const distinctCardsNeeded = Math.ceil(requiredDensity / copies);

      // Generate a package for each distinct card slot
      // For Land, we produce a single package since land distribution is handled separately
      if (role === 'MANA_BASE' || req.role === 'Land') {
        packages.push(new CapabilityPackage({
          role: req.role || 'Land',
          requiredDensity,
          allocatedDensity: requiredDensity,
          winnerCard: 'Land (Karsten-calculated)',
          copies: requiredDensity,
          alternatives: [],
          priority,
          lockLevel: LockLevel.LOCK_HARD,
          rationale: req.rationale || `Mana base: ${requiredDensity} lands allocated by CopyAllocationManager`
        }));
      } else {
        // For spells: allocate density across distinct winners at `copies` each
        for (let i = 0; i < distinctCardsNeeded; i++) {
          const thisSlotCopies = Math.min(copies, requiredDensity - (i * copies));
          if (thisSlotCopies <= 0) break;

          packages.push(new CapabilityPackage({
            role: req.role || role,
            requiredDensity: thisSlotCopies,
            allocatedDensity: thisSlotCopies,
            winnerCard: `[Pending: ${req.role || role} #${i + 1}]`,
            copies: thisSlotCopies,
            alternatives: [],
            priority,
            lockLevel,
            rationale: req.rationale || `${thisSlotCopies}x allocation in ${mode} mode for ${req.role || role}`
          }));
        }
      }
    });

    return Object.freeze([...packages]);
  }

  /**
   * Builds the CopyAllocationState — the verified, immutable snapshot
   * that the BlueprintEditor renders.
   * 
   * @param {CapabilityRequirement[]} requirements - From deriveRequirementsFromStrategy()
   * @param {string} format - Deck format
   * @param {string|null} userModeOverride - Optional user mode override
   * @returns {CopyAllocationState} Verified allocation state for UI display
   */
  static buildCopyAllocationState(requirements, format = 'MODERN', userModeOverride = null) {
    const { mode, source } = resolveAllocationMode(format, userModeOverride);
    const packages = CopyAllocationManager.allocatePackages(requirements, mode);

    return new CopyAllocationState({
      packages,
      mode,
      modeSource: source,
      format
    });
  }

  /**
   * Recibe una propuesta de reparación (ej. "faltan 2 tierras") y recalcula los paquetes de forma gobernada.
   * This is the ONLY authorized way to modify copy counts post-allocation.
   */
  static processRepairProposal(currentPackages = [], repairProposal = {}) {
    const updated = [...currentPackages];
    if (repairProposal.action === 'ADD_LAND_DENSITY') {
      updated.push(new CapabilityPackage({
        role: 'LAND_BASE',
        requiredDensity: repairProposal.amount || 2,
        allocatedDensity: repairProposal.amount || 2,
        winnerCard: 'Forest',
        copies: repairProposal.amount || 2,
        priority: PackagePriority.PRIORITY_1_CORE,
        lockLevel: LockLevel.LOCK_HARD,
        rationale: 'Ajuste de base de maná autorizado por CopyAllocationManager'
      }));
    }
    return Object.freeze([...updated]);
  }
}
