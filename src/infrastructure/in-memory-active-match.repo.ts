import type { ActiveMatch } from "../domain/active-match/active-match.entity.js";
import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";
import type { RedisActiveMatchRepo } from "./redis-active-match.repo.js";

export class InMemoryActiveMatchRepo implements IActiveMatchRepo {
  private readonly store = new Map<string, ActiveMatch>();

  constructor(private readonly redisRepo: RedisActiveMatchRepo) {}

  async saveActiveMatch(activeMatch: ActiveMatch): Promise<void> {
    this.store.set(activeMatch.id, activeMatch);

    await this.redisRepo.saveActiveMatch(activeMatch);
  }
  async updateActiveMatchState(
    newActiveMatchState: ActiveMatch,
  ): Promise<void> {
    this.store.set(newActiveMatchState.id, newActiveMatchState);

    await this.redisRepo.updateActiveMatchState(newActiveMatchState);
  }
  async deleteActiveMatch(matchId: string): Promise<void> {
    this.store.delete(matchId);

    await this.redisRepo.deleteActiveMatch(matchId);
  }
  async findActiveMatchById(matchId: string): Promise<ActiveMatch | null> {
    // Check in memory store
    const cachedMatch = this.store.get(matchId);
    if (cachedMatch) return cachedMatch;

    // Fallback to Redis on in memory miss (e.g. server restarted mid-game)
    const redisMatch = await this.redisRepo.findActiveMatchById(matchId);
    if (redisMatch) {
      this.store.set(matchId, redisMatch);
      return redisMatch;
    }

    return null;
  }
}
