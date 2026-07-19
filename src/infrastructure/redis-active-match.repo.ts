import type { RedisClientType } from "redis";
import { ActiveMatch } from "../domain/active-match/active-match.entity.js";
import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";

export class RedisActiveMatchRepo implements IActiveMatchRepo {
  private readonly prefix = "active-match:";

  constructor(private readonly redisClient: RedisClientType) {}

  async saveActiveMatch(activeMatch: ActiveMatch): Promise<void> {
    const key = this.keyCrafter(activeMatch.id);
    const data = JSON.stringify({
      activeMatch,
    });

    // Adjust TTL as needed for your match duration
    await this.redisClient.set(key, data);
  }

  async updateActiveMatchState(
    newActiveMatchState: ActiveMatch,
  ): Promise<void> {
    const key = this.keyCrafter(newActiveMatchState.id);
    const newState = {
      sideToMove: newActiveMatchState.sideToMove,
      moveHistory: JSON.stringify(newActiveMatchState.moveHistory),
    };

    await this.redisClient.hSet(key, newState);
  }

  async findActiveMatchById(matchId: string): Promise<ActiveMatch | null> {
    const data = await this.redisClient.get(`${this.prefix}${matchId}`);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Reconstruct instance to preserve domain methods
    const match = new ActiveMatch(parsed.matchFound);
    match.sideToMove = parsed.sideToMove;
    match.moveHistory = parsed.moveHistory;

    return match;
  }

  async deleteActiveMatch(matchId: string): Promise<void> {
    await this.redisClient.del(`${this.prefix}${matchId}`);
  }

  private keyCrafter(matchId: string): string {
    return `${this.prefix}${matchId}`;
  }
}
