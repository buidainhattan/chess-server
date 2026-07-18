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

  async joinQueue(playerId: string): Promise<{ alreadyQueued: boolean }> {
    const existingQueue =
      await this.matchmakingRepo.findMatchRequestByPlayerId(playerId);
    if (existingQueue) {
      return { alreadyQueued: true };
    }

    const matchRequest = new MatchRequest(randomUUID(), playerId);
    await this.matchmakingRepo.saveMatchRequest(matchRequest);

    return { alreadyQueued: false };
  }

  async leaveQueue(playerId: string): Promise<void> {
    await this.matchmakingRepo.deleteMatchRequest(playerId);
  }

  async matchmaking(playerId: string): Promise<MatchFound | null> {
    const matchRequests = await this.matchmakingRepo.findWaitingMatchRequests();

    if (matchRequests.length <= 1) return null;

    let matchFoundEvent = null;
    for (const matchRequest of matchRequests) {
      if (matchRequest.isOwnedBy(playerId)) continue;

      await this.matchmakingRepo.deleteMatchRequest(matchRequest.playerId);
      await this.matchmakingRepo.deleteMatchRequest(playerId);

      matchFoundEvent = new MatchFound(
        randomUUID(),
        matchRequest.playerId,
        playerId,
      );
    }

    return matchFoundEvent;
  }
}
