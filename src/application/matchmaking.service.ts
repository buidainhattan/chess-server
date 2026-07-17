// src/application/matchmaking/matchmaking.service.ts
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { type IMatchmakingRepo } from "../domain/matchmaking/imatchmaking.repo.js";
import { MatchRequest } from "../domain/matchmaking/match-request.entity.js";
import { MatchFound } from "../domain/matchmaking/match-found.event.js";

export class MatchmakingService {
  constructor(
    private readonly matchmakingRepo: IMatchmakingRepo,
    private readonly eventEmitter: EventEmitter,
  ) {}

  async joinQueue(playerId: string): Promise<{ queueing: boolean }> {
    const existing =
      await this.matchmakingRepo.findMatchRequestByPlayerId(playerId);
    if (existing) {
      return { queueing: true };
    }

    const matchRequest = new MatchRequest(randomUUID(), playerId);
    await this.matchmakingRepo.saveMatchRequest(matchRequest);

    const { matchFound: matchFound } = await this.matchmaking(playerId);

    if (matchFound) {
      return { queueing: false };
    }

    return { queueing: true };
  }

  async leaveQueue(playerId: string): Promise<void> {
    await this.matchmakingRepo.deleteMatchRequest(playerId);
  }

  private async matchmaking(
    playerId: string,
  ): Promise<{ matchFound: boolean }> {
    const opponent =
      await this.matchmakingRepo.findWaitingMatchRequest(playerId);

    if (opponent) {
      await this.matchmakingRepo.deleteMatchRequest(playerId);
      await this.matchmakingRepo.deleteMatchRequest(opponent.playerId);

      const event = new MatchFound(randomUUID(), opponent.playerId, playerId);
      this.eventEmitter.emit(MatchFound.NAME, event);

      return { matchFound: true };
    }

    return { matchFound: false };
  }
}
