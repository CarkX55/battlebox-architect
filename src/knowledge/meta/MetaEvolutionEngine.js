/**
 * MetaEvolutionEngine.js
 * Time-Series Metagame Evolution Engine.
 * Tracks archetype popularity, winrate trajectory, and metagame mutations across historical snapshots.
 */

export class MetaEvolutionEngine {
  constructor() {
    this.snapshots = new Map();
  }

  recordSnapshot(weekId, archetypeData = []) {
    const snapshot = {
      weekId,
      timestamp: new Date().toISOString(),
      archetypes: Object.freeze(archetypeData.map(a => ({
        name: a.name,
        metaShare: a.metaShare || 0,
        winrate: a.winrate || 0.50,
        topKeyCards: Object.freeze([...(a.topKeyCards || [])])
      })))
    };

    this.snapshots.set(weekId, Object.freeze(snapshot));
    return snapshot;
  }

  getArchetypeTrajectory(archetypeName) {
    const trajectory = [];
    for (const [weekId, snap] of this.snapshots.entries()) {
      const arch = snap.archetypes.find(a => a.name.toLowerCase() === archetypeName.toLowerCase());
      if (arch) {
        trajectory.push({
          weekId,
          timestamp: snap.timestamp,
          metaShare: arch.metaShare,
          winrate: arch.winrate
        });
      }
    }
    return trajectory;
  }

  detectMetaShifts(currentWeekId, previousWeekId) {
    const curr = this.snapshots.get(currentWeekId);
    const prev = this.snapshots.get(previousWeekId);

    if (!curr || !prev) return { shifts: [] };

    const shifts = [];
    for (const currArch of curr.archetypes) {
      const prevArch = prev.archetypes.find(a => a.name === currArch.name);
      if (prevArch) {
        const shareDelta = Number((currArch.metaShare - prevArch.metaShare).toFixed(3));
        const winrateDelta = Number((currArch.winrate - prevArch.winrate).toFixed(3));
        if (Math.abs(shareDelta) > 0.02 || Math.abs(winrateDelta) > 0.02) {
          shifts.push({
            archetype: currArch.name,
            shareDelta,
            winrateDelta,
            trend: shareDelta > 0 ? 'RISING' : 'DECLINING'
          });
        }
      }
    }

    return { currentWeekId, previousWeekId, shifts: Object.freeze(shifts) };
  }
}
