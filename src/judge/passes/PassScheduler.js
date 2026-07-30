/**
 * src/judge/passes/PassScheduler.js
 * Schedules and runs analysis passes according to format manifest and DAG resolution.
 */

import { PassGraph } from './PassGraph.js';
import { PassRegistry } from './PassRegistry.js';

export class PassScheduler {
  constructor(registry = new PassRegistry()) {
    this.registry = registry;
  }

  schedulePasses(manifest) {
    const passGraph = new PassGraph();
    const manifestPasses = manifest.passes || [];

    manifestPasses.forEach(passName => {
      passGraph.addPass(passName, []);
    });

    const orderedPassNames = passGraph.resolveExecutionOrder();
    return orderedPassNames.map(name => this.registry.createPassInstance(name));
  }
}
