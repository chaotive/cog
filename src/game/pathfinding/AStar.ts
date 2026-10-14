import { GridCoord, manhattanDistance, coordKey, parseCoordKey } from '../grid/GridCoord';

export interface PathfinderOptions {
  isPassable: (x: number, y: number) => boolean;
  getCost?: (fromX: number, fromY: number, toX: number, toY: number) => number;
  maxDistance?: number;
  allowDiagonal?: boolean;
}

interface PathNode {
  coord: GridCoord;
  gCost: number;
  hCost: number;
  fCost: number;
  parent?: PathNode;
}

export class AStar {
  /**
   * Finds shortest path from start to goal. Returns array of coordinates including goal, excluding start.
   */
  public static findPath(
    start: GridCoord,
    goal: GridCoord,
    options: PathfinderOptions
  ): GridCoord[] | null {
    if (start.x === goal.x && start.y === goal.y) {
      return [];
    }

    if (!options.isPassable(goal.x, goal.y)) {
      return null;
    }

    const openSet: Map<string, PathNode> = new Map();
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      coord: start,
      gCost: 0,
      hCost: manhattanDistance(start, goal),
      fCost: manhattanDistance(start, goal),
    };

    openSet.set(coordKey(start), startNode);

    const directions = options.allowDiagonal
      ? [
          { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
          { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 },
        ]
      : [
          { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        ];

    while (openSet.size > 0) {
      // Find node with lowest fCost
      let current: PathNode | null = null;
      for (const node of openSet.values()) {
        if (!current || node.fCost < current.fCost || (node.fCost === current.fCost && node.hCost < current.hCost)) {
          current = node;
        }
      }

      if (!current) break;

      const currentKey = coordKey(current.coord);

      // Check if reached goal
      if (current.coord.x === goal.x && current.coord.y === goal.y) {
        const path: GridCoord[] = [];
        let curr: PathNode | undefined = current;
        while (curr && curr.parent) {
          path.unshift(curr.coord);
          curr = curr.parent;
        }
        return path;
      }

      openSet.delete(currentKey);
      closedSet.add(currentKey);

      for (const dir of directions) {
        const neighborCoord: GridCoord = {
          x: current.coord.x + dir.x,
          y: current.coord.y + dir.y,
        };
        const neighborKey = coordKey(neighborCoord);

        if (closedSet.has(neighborKey)) continue;

        // Passability check (unless it's the goal itself)
        const isGoal = neighborCoord.x === goal.x && neighborCoord.y === goal.y;
        if (!isGoal && !options.isPassable(neighborCoord.x, neighborCoord.y)) {
          continue;
        }

        const stepCost = options.getCost
          ? options.getCost(current.coord.x, current.coord.y, neighborCoord.x, neighborCoord.y)
          : 1;

        const tentativeGCost = current.gCost + stepCost;

        if (options.maxDistance && tentativeGCost > options.maxDistance) {
          continue;
        }

        let neighborNode = openSet.get(neighborKey);

        if (!neighborNode) {
          const hCost = manhattanDistance(neighborCoord, goal);
          neighborNode = {
            coord: neighborCoord,
            gCost: tentativeGCost,
            hCost,
            fCost: tentativeGCost + hCost,
            parent: current,
          };
          openSet.set(neighborKey, neighborNode);
        } else if (tentativeGCost < neighborNode.gCost) {
          neighborNode.gCost = tentativeGCost;
          neighborNode.fCost = tentativeGCost + neighborNode.hCost;
          neighborNode.parent = current;
        }
      }
    }

    return null;
  }
}
