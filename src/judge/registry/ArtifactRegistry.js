/**
 * ArtifactRegistry.js
 * Append-Only Versioned Artifact Registry.
 * Enforces Knowledge Monotonicity.
 */

export class ArtifactRegistry {
  constructor() {
    this.artifacts = new Map(); // artifactType ➔ Array<ArtifactEntry>
  }

  publish(type, artifact, metadata = {}) {
    if (!type || !artifact) {
      throw new Error('[ArtifactRegistry] Cannot publish null type or artifact.');
    }

    if (!this.artifacts.has(type)) {
      this.artifacts.set(type, []);
    }

    const typeList = this.artifacts.get(type);
    const versionNumber = typeList.length + 1;

    const entry = Object.freeze({
      version: versionNumber,
      type,
      timestamp: Date.now(),
      producer: metadata.producer || 'System',
      artifact: Object.freeze(artifact),
      metadata: Object.freeze({ ...metadata })
    });

    typeList.push(entry);
    return entry;
  }

  getLatest(type) {
    const typeList = this.artifacts.get(type);
    if (!typeList || typeList.length === 0) return null;
    return typeList[typeList.length - 1];
  }

  getVersion(type, versionNumber) {
    const typeList = this.artifacts.get(type);
    if (!typeList) return null;
    return typeList.find(entry => entry.version === versionNumber) || null;
  }
}
