import { type IMatchmakingRepo } from "../domain/matchmaking/imatchmaking.repo.js";
import { MatchRequest } from "../domain/matchmaking/match-request.entity.js";

export class InMemoryMatchmakingRepo implements IMatchmakingRepo {
  private readonly store = new Map<string, MatchRequest>();

  async saveMatchRequest(matchRequest: MatchRequest): Promise<void> {
    this.store.set(matchRequest.playerId, matchRequest);
  }

  async deleteMatchRequest(playerId: string): Promise<void> {
    this.store.delete(playerId);
  }

  async findMatchRequestByPlayerId(
    playerId: string,
  ): Promise<MatchRequest | null> {
    return this.store.get(playerId) ?? null;
  }

  async findWaitingMatchRequests(): Promise<MatchRequest[]> {
    return Array.from(this.store.values());
  }
}
