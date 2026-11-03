export const cases = [
  { mode: 'legacy', title: '2.5.0 — default', version: '2.5.0', package: 'dagre-legacy', expected: ['R', '1 2 3', '1.1 1.2 2.1 3.1'] },
  { mode: 'current', title: '4.0.1 — default', version: '4.0.1', package: 'dagre-current', expected: ['R', '3 2 1', '3.1 2.1 1.2 1.1'] },
  { mode: 'sorted', title: '4.0.1 + explicit input sorting', version: '4.0.1', package: 'dagre-current', expected: ['R', '3 2 1', '3.1 2.1 1.2 1.1'] }
];

export function createElements() {
  const nodes = [
    ['R', 'R', 1, '#555555'],
    ['A', '1', 2, '#326da8'], ['B', '2', 2, '#a85d20'], ['C', '3', 2, '#317d4b'],
    ['A1', '1.1', 3, '#326da8'], ['A2', '1.2', 3, '#326da8'],
    ['B1', '2.1', 3, '#a85d20'], ['C1', '3.1', 3, '#317d4b']
  ];
  const edges = [['R', 'A'], ['R', 'B'], ['R', 'C'], ['A', 'A1'], ['A', 'A2'], ['B', 'B1'], ['C', 'C1']];
  return [
    ...nodes.map(([id, label, level, color], order) => ({ data: { id, label, level, color, order } })),
    ...edges.map(([source, target], order) => ({ data: { id: `${source}-${target}`, source, target, order } }))
  ];
}

export const style = [
  { selector: 'node', style: {
    width: 20, height: 20, label: 'data(label)', 'font-size': 16,
    'text-valign': 'bottom', 'text-margin-y': 6, 'background-color': 'data(color)'
  } },
  { selector: 'edge', style: {
    width: 1, 'curve-style': 'straight', 'target-arrow-shape': 'triangle',
    'line-color': '#888', 'target-arrow-color': '#888'
  } }
];

export function layoutOptions(mode) {
  const options = { name: 'dagre', animate: false, fit: false, nodeDimensionsIncludeLabels: false };
  if (mode === 'sorted') {
    options.sort = (first, second) => first.data('order') - second.data('order');
  }
  return options;
}

export function summarize(cy, scenario, cytoscapeVersion) {
  const positions = cy.nodes().map(node => ({
    id: node.id(), label: node.data('label'), level: node.data('level'),
    ...node.position(), width: node.width(), height: node.height()
  }));
  const levels = [1, 2, 3].map(level => {
    const nodes = positions.filter(node => node.level === level).sort((first, second) => first.x - second.x);
    return { level, y: nodes[0]?.y, nodes, order: nodes.map(node => node.label).join(' ') };
  });
  const expectedElements = createElements();
  const topology = cy.elements().map(element => ({ ...element.data() }));
  const valid = JSON.stringify(topology) === JSON.stringify(expectedElements.map(element => element.data))
    && positions.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)
      && node.width === 20 && node.height === 20)
    && levels.every((level, index) => level.nodes.length === [1, 3, 4][index]
      && (index === 0 || level.y > levels[index - 1].y)
      && level.nodes.every(node => node.y === level.y)
      && level.nodes.every((node, nodeIndex) => nodeIndex === 0 || node.x > level.nodes[nodeIndex - 1].x));
  return {
    mode: scenario.mode, version: scenario.version, cytoscapeVersion,
    order: levels[1].order, levels, positions, topology,
    matchesExpected: valid && cytoscapeVersion === '3.34.0'
      && levels.every((level, index) => level.order === scenario.expected[index])
  };
}

export function comparisonMatches(results) {
  if (results.length !== cases.length || results.some(result => !result || !result.matchesExpected)) return false;
  const legacy = results[0];
  return results.every(result => JSON.stringify(result.topology) === JSON.stringify(legacy.topology))
    && JSON.stringify(results[1].positions) === JSON.stringify(results[2].positions)
    && results.slice(1).every(result => legacy.positions.every(legacyNode => {
      const modernNode = result.positions.find(node => node.id === legacyNode.id);
      return modernNode && legacyNode.x + modernNode.x === 230 && legacyNode.y === modernNode.y;
    }));
}
