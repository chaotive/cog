import { WorldMap } from './WorldMap';
import { EnemyEntity } from './EnemyEntity';
import { Expedition } from './Expedition';
import { GridCoord, manhattanDistance } from '../../game/grid/GridCoord';
import { AStar } from '../../game/pathfinding/AStar';

export interface AIActionResult {
  enemy: EnemyEntity;
  type: 'MOVED' | 'ATTACKED' | 'IDLE';
  fromCoord: GridCoord;
  toCoord: GridCoord;
  message?: string;
}

export class EnemyAI {
  public static processEnemyTurn(
    map: WorldMap,
    enemies: EnemyEntity[],
    playerCoord: GridCoord,
    expedition: Expedition
  ): AIActionResult[] {
    const results: AIActionResult[] = [];

    for (const enemy of enemies) {
      if (!enemy.isActive || enemy.isDefeated) continue;

      const fromCoord: GridCoord = { x: enemy.x, y: enemy.y };

      // Check if enemy can move this turn based on speed
      if (!enemy.canMoveThisTurn()) {
        results.push({
          enemy,
          type: 'IDLE',
          fromCoord,
          toCoord: fromCoord,
        });
        continue;
      }

      const dist = manhattanDistance(fromCoord, playerCoord);

      // Check if adjacent to player -> Attacks!
      if (dist === 1) {
        results.push({
          enemy,
          type: 'ATTACKED',
          fromCoord,
          toCoord: playerCoord,
          message: `${enemy.name} attacked the expedition!`,
        });
        continue;
      }

      // If within detection range, pursue player
      if (dist <= enemy.detectionRange) {
        const path = AStar.findPath(fromCoord, playerCoord, {
          isPassable: (x, y) => {
            // Player location is passable (target)
            if (x === playerCoord.x && y === playerCoord.y) return true;
            // Terrain must be passable
            if (!map.isPassable(x, y)) return false;
            // No other enemy on that cell
            const otherEnemy = map.getEnemyAt(x, y);
            return !otherEnemy || otherEnemy === enemy;
          },
          maxDistance: 12,
        });

        if (path && path.length > 0) {
          const nextStep = path[0];

          if (nextStep.x === playerCoord.x && nextStep.y === playerCoord.y) {
            // Reached player, attack!
            results.push({
              enemy,
              type: 'ATTACKED',
              fromCoord,
              toCoord: playerCoord,
              message: `${enemy.name} lunged at your party!`,
            });
          } else {
            // Step forward
            enemy.setPosition(nextStep.x, nextStep.y);
            results.push({
              enemy,
              type: 'MOVED',
              fromCoord,
              toCoord: nextStep,
            });
          }
          continue;
        }
      }

      // Otherwise wander or stay idle
      if (Math.random() < 0.3) {
        const deltas = [
          { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        ];
        const randomDelta = deltas[Math.floor(Math.random() * deltas.length)];
        const nx = enemy.x + randomDelta.x;
        const ny = enemy.y + randomDelta.y;

        if (map.isPassable(nx, ny) && !map.getEnemyAt(nx, ny) && (nx !== playerCoord.x || ny !== playerCoord.y)) {
          enemy.setPosition(nx, ny);
          results.push({
            enemy,
            type: 'MOVED',
            fromCoord,
            toCoord: { x: nx, y: ny },
          });
          continue;
        }
      }

      results.push({
        enemy,
        type: 'IDLE',
        fromCoord,
        toCoord: fromCoord,
      });
    }

    return results;
  }
}
