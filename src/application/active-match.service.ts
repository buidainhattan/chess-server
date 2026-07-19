import { EventEmitter } from "events";
import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";
import { MatchFound } from "../domain/shared/match-found.event.js";
import { ActiveMatch } from "../domain/active-match/active-match.entity.js";

export class ActiveMatchService {
  private readonly matchInitializer = async (
    matchFoundEvent: MatchFound,
  ): Promise<void> => {
    await this.initializeMatch(matchFoundEvent);
  };

  constructor(
    private readonly activeMatchRepo: IActiveMatchRepo,
    private readonly eventEmitter: EventEmitter,
  ) {
    this.eventEmitter.on(MatchFound.NAME, this.matchInitializer);
  }

  dispose(): void {
    this.eventEmitter.off(MatchFound.NAME, this.matchInitializer);
  }

  async makeMove(
    matchId: string,
    playerId: string,
    move: string,
  ): Promise<{ completed: boolean }> {
    const match = await this.activeMatchRepo.findActiveMatchById(matchId);
    if (!match) {
      return { completed: false };
    }

    const isValid = match.validate(playerId, move);
    if (!isValid) {
      return { completed: false };
    }

    // Check if the move pushed the game into a terminal state
    if (match.status !== "ongoing") {
      await this.activeMatchRepo.deleteActiveMatch(matchId);
    } else {
      await this.activeMatchRepo.updateActiveMatchState(match);
    }

    return { completed: true };
  }

  async resign(
    matchId: string,
    playerId: string,
  ): Promise<{ completed: boolean }> {
    const match = await this.activeMatchRepo.findActiveMatchById(matchId);
    if (!match) {
      return { completed: false };
    }

    const isValid = match.resign(playerId);
    if (!isValid) {
      return { completed: false };
    }

    // Resignation immediately ends the game; clean up the active match cache
    await this.activeMatchRepo.deleteActiveMatch(matchId);

    return { completed: true };
  }

  private async initializeMatch(matchFoundEvent: MatchFound): Promise<void> {
    const activeMatch = new ActiveMatch(matchFoundEvent);

    await this.activeMatchRepo.saveActiveMatch(activeMatch);
  }
}
