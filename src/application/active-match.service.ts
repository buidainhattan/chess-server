import { EventEmitter } from "events";
import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";
import type { Side } from "../domain/shared/side.type.js";
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
    sideToMove: Side,
    move: string,
  ): Promise<{ completed: boolean }> {
    const match = await this.activeMatchRepo.findActiveMatchById(matchId);
    if (!match) {
      return { completed: false };
    }

    const state = match.validate(sideToMove, move);

    if (state) {
    }

    return { completed: state };
  }

  private async initializeMatch(matchFoundEvent: MatchFound): Promise<void> {
    const activeMatch = new ActiveMatch(matchFoundEvent);

    await this.activeMatchRepo.saveActiveMatch(activeMatch);
  }
}
