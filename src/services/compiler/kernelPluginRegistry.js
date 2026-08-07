/**
 * src/services/compiler/kernelPluginRegistry.js
 * 
 * KernelPluginRegistry: Registro Dinámico de Módulos y Proveedores.
 * Administra la inscripción de módulos de compilador y valida sus permisos (ModuleCapabilities).
 * 
 * Contrato de Módulo (CompilerModule):
 * - id: string
 * - phase: string
 * - requires: Array<string> (Dependencias de módulos/fases requeridos)
 * - capabilities: { canRead: Array, canWrite: Array, consumesEvents: Array, producesEvents: Array }
 * - execute(kernelContext): Promise<ModuleResult>
 */

export class KernelPluginRegistry {
  constructor() {
    this.registeredModules = new Map(); // moduleId -> CompilerModule
    this.phaseMap = new Map(); // phase -> Set<moduleId>
  }

  /**
   * Registra un módulo validando el contrato de la interfaz y permisos
   */
  registerModule(compilerModule) {
    if (!compilerModule || !compilerModule.id) {
      throw new Error('[KernelPluginRegistry Error] Todo módulo debe poseer un id único.');
    }

    if (typeof compilerModule.execute !== 'function') {
      throw new Error(`[KernelPluginRegistry Error] Módulo ${compilerModule.id} debe implementar el método execute().`);
    }

    const normalizedModule = Object.freeze({
      id: compilerModule.id,
      phase: compilerModule.phase || 'unassigned',
      requires: Object.freeze([...(compilerModule.requires || [])]),
      capabilities: Object.freeze({
        canRead: Object.freeze([...(compilerModule.capabilities?.canRead || [])]),
        canWrite: Object.freeze([...(compilerModule.capabilities?.canWrite || [])]),
        consumesEvents: Object.freeze([...(compilerModule.capabilities?.consumesEvents || [])]),
        producesEvents: Object.freeze([...(compilerModule.capabilities?.producesEvents || [])])
      }),
      execute: compilerModule.execute.bind(compilerModule)
    });

    this.registeredModules.set(normalizedModule.id, normalizedModule);

    if (!this.phaseMap.has(normalizedModule.phase)) {
      this.phaseMap.set(normalizedModule.phase, new Set());
    }
    this.phaseMap.get(normalizedModule.phase).add(normalizedModule.id);

    console.log(`🔌 [KernelPluginRegistry] Módulo registrado exitosamente: ${normalizedModule.id} (Fase: ${normalizedModule.phase})`);
    return normalizedModule;
  }

  /**
   * Obtiene un módulo registrado por su ID
   */
  getModule(moduleId) {
    return this.registeredModules.get(moduleId) || null;
  }

  /**
   * Obtiene todos los módulos registrados
   */
  getAllModules() {
    return Array.from(this.registeredModules.values());
  }

  /**
   * Resuelve el orden topológico de ejecución basado en las dependencias declaradas en `requires`
   */
  getTopologicalExecutionOrder() {
    const modules = this.getAllModules();
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (mod) => {
      if (visiting.has(mod.id)) {
        throw new Error(`[KernelPluginRegistry Error] Dependencia circular detectada involucrando al módulo: ${mod.id}`);
      }
      if (!visited.has(mod.id)) {
        visiting.add(mod.id);
        for (const reqId of mod.requires) {
          const depModule = this.getModule(reqId);
          if (depModule) {
            visit(depModule);
          }
        }
        visiting.delete(mod.id);
        visited.add(mod.id);
        order.push(mod);
      }
    };

    for (const mod of modules) {
      if (!visited.has(mod.id)) {
        visit(mod);
      }
    }

    return order;
  }
}
