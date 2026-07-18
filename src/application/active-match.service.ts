import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";
import type { Side } from "../domain/shared/side.type.js";

export class ActiveMatchService {
  constructor(
    private readonly activeMatchRepo: IActiveMatchRepo,
  ) {}

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

    return { completed: state };
  }
}
