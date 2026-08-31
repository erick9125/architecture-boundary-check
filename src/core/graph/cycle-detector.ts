import type { DependencyGraph } from './dependency-graph.js';
import type { DependencyCycle } from './dependency-cycle.js';

interface NodeState {
  readonly index: number;
  lowLink: number;
  onStack: boolean;
}

interface Frame {
  readonly node: string;
  readonly state: NodeState;
  readonly neighbors: readonly string[];
  position: number;
}

interface PathFrame {
  readonly neighbors: readonly string[];
  position: number;
}

/**
 * Reports one representative cycle per strongly connected component.
 *
 * Every file in a component can reach every other one, so a component is the
 * unit a developer has to break; listing each elementary cycle inside it is
 * exponential in the worst case and would bury the report. Traversal is
 * iterative because a dependency chain can be far deeper than the call stack.
 */
export function detectCycles(graph: DependencyGraph): readonly DependencyCycle[] {
  const cycles: DependencyCycle[] = [];

  for (const component of stronglyConnectedComponents(graph)) {
    const files = representativeCycle(graph, component);
    if (files.length > 0) {
      cycles.push({ files });
    }
  }

  return cycles.sort((left, right) =>
    compare(left.files[0], right.files[0]),
  );
}

/** Tarjan's algorithm, with the recursion turned into an explicit frame stack. */
function stronglyConnectedComponents(graph: DependencyGraph): string[][] {
  const states = new Map<string, NodeState>();
  const stack: string[] = [];
  const components: string[][] = [];
  let nextIndex = 0;

  const open = (node: string): Frame => {
    const state: NodeState = {
      index: nextIndex,
      lowLink: nextIndex,
      onStack: true,
    };

    nextIndex += 1;
    states.set(node, state);
    stack.push(node);

    return { node, state, neighbors: graph.getAdjacency(node), position: 0 };
  };

  for (const start of graph.getFiles()) {
    if (states.has(start)) {
      continue;
    }

    const frames: Frame[] = [open(start)];

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) {
        break;
      }

      const neighbor = frame.neighbors[frame.position];
      if (neighbor !== undefined) {
        frame.position += 1;

        const known = states.get(neighbor);
        if (known === undefined) {
          frames.push(open(neighbor));
        } else if (known.onStack) {
          frame.state.lowLink = Math.min(frame.state.lowLink, known.index);
        }

        continue;
      }

      frames.pop();

      const parent = frames[frames.length - 1];
      if (parent !== undefined) {
        parent.state.lowLink = Math.min(parent.state.lowLink, frame.state.lowLink);
      }

      if (frame.state.lowLink === frame.state.index) {
        components.push(popComponent(stack, states, frame.node));
      }
    }
  }

  return components;
}

function popComponent(
  stack: string[],
  states: ReadonlyMap<string, NodeState>,
  root: string,
): string[] {
  const component: string[] = [];

  for (;;) {
    const popped = stack.pop();
    if (popped === undefined) {
      break;
    }

    const state = states.get(popped);
    if (state !== undefined) {
      state.onStack = false;
    }

    component.push(popped);
    if (popped === root) {
      break;
    }
  }

  return component;
}

/**
 * Walks the component from its lowest-sorting file until an edge leads back to
 * it. Starting from that file, and sorting the edges, keeps the reported path
 * stable across runs.
 */
function representativeCycle(
  graph: DependencyGraph,
  component: readonly string[],
): string[] {
  const start = [...component].sort(compare)[0];
  if (start === undefined) {
    return [];
  }

  if (component.length === 1) {
    return graph.getAdjacency(start).includes(start) ? [start] : [];
  }

  const members = new Set(component);
  const visited = new Set<string>([start]);
  const path: string[] = [start];
  const frames: PathFrame[] = [
    { neighbors: neighborsWithin(graph, start, members), position: 0 },
  ];

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    if (frame === undefined) {
      break;
    }

    const neighbor = frame.neighbors[frame.position];
    if (neighbor === undefined) {
      frames.pop();
      path.pop();
      continue;
    }

    frame.position += 1;

    if (neighbor === start) {
      return [...path];
    }

    if (visited.has(neighbor)) {
      continue;
    }

    visited.add(neighbor);
    path.push(neighbor);
    frames.push({
      neighbors: neighborsWithin(graph, neighbor, members),
      position: 0,
    });
  }

  return [];
}

function neighborsWithin(
  graph: DependencyGraph,
  node: string,
  members: ReadonlySet<string>,
): readonly string[] {
  return graph
    .getAdjacency(node)
    .filter((neighbor) => members.has(neighbor))
    .sort(compare);
}

function compare(left: string | undefined, right: string | undefined): number {
  if (left === right) {
    return 0;
  }

  if (left === undefined) {
    return -1;
  }

  if (right === undefined) {
    return 1;
  }

  return left < right ? -1 : 1;
}
