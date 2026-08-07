/**
 * src/services/compiler/core/reasoningAST.js
 * 
 * ReasoningAST & Renderers: Árbol de Sintaxis Abstracta de Razonamiento Estratégico.
 * El AST es un artefacto puro de datos (no un log plano).
 * Un renderizador desacoplado convierte el AST a Markdown, HTML, JSON, React o consola.
 */

export class ReasoningNode {
  constructor(type, payload = {}, children = []) {
    this.type = type; // GoalNode | CapabilityNode | ActionNode | CritiqueNode | RepairNode | DecisionNode
    this.payload = Object.freeze({ ...payload });
    this.children = Object.freeze([...children]);
    Object.freeze(this);
  }

  toJSON() {
    return {
      type: this.type,
      payload: this.payload,
      children: this.children.map(c => typeof c.toJSON === 'function' ? c.toJSON() : c)
    };
  }
}

export class ReasoningAST {
  static buildAST(compilationSession = {}) {
    const rootChildren = [];

    // 1. Goal Node
    rootChildren.push(new ReasoningNode('GoalNode', {
      macroGoal: compilationSession.macroGoal || 'Victory Strategy',
      targetTurn: compilationSession.targetTurn || 4,
      targetProbability: compilationSession.targetProbability || 0.85
    }));

    // 2. Capability Nodes
    const capNodes = (compilationSession.capabilities || []).map(c => 
      new ReasoningNode('CapabilityNode', { capabilityId: c.capabilityId, units: c.targetUnits })
    );
    rootChildren.push(new ReasoningNode('CapabilityGroupNode', {}, capNodes));

    // 3. Critique Nodes
    const critiqueNodes = (compilationSession.critiques || []).map(cr => 
      new ReasoningNode('CritiqueNode', { criticId: cr.criticId, issue: cr.issue, severity: cr.severity })
    );
    if (critiqueNodes.length > 0) {
      rootChildren.push(new ReasoningNode('CritiqueGroupNode', {}, critiqueNodes));
    }

    // 4. Decision Node
    rootChildren.push(new ReasoningNode('DecisionNode', {
      status: compilationSession.status || 'ACCEPTED',
      utilityScore: compilationSession.utilityScore || 92.5
    }));

    return new ReasoningNode('ReasoningRoot', { timestamp: Date.now() }, rootChildren);
  }

  static renderToMarkdown(astNode) {
    if (!astNode) return '';
    const indent = '  ';

    const renderNode = (node, depth = 0) => {
      const prefix = depth > 0 ? indent.repeat(depth) + '• ' : '';
      let text = `${prefix}[${node.type}]`;

      if (node.payload && Object.keys(node.payload).length > 0) {
        text += `: ${JSON.stringify(node.payload)}`;
      }
      text += '\n';

      if (node.children) {
        for (const child of node.children) {
          text += renderNode(child, depth + 1);
        }
      }
      return text;
    };

    return renderNode(astNode, 0);
  }

  static renderToJSON(astNode) {
    return JSON.stringify(astNode.toJSON(), null, 2);
  }
}
