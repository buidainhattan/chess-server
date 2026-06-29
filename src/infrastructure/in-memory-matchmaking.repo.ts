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

  async findWaitingMatchRequest(
    excludePlayerId: string,
  ): Promise<MatchRequest | null> {
    for (const [playerId, matchRequest] of this.store) {
      if (playerId !== excludePlayerId) {
        return matchRequest;
      }
    }
    return null;
  }
}
