import type { MatchFound } from "../shared/match-found.event.js";
import type { Side } from "../shared/side.type.js";

export class ActiveMatch {
  readonly id: string;
  readonly playerOneId: string;
  readonly playerTwoId: string;
  sideToMove: Side = "white";
  moveHistory: string[] = [];
  readonly startAt: Date = new Date();
  
  constructor(readonly matchFound: MatchFound) {
    this.id = matchFound.id;
    this.playerOneId = matchFound.playerOneId;
    this.playerTwoId = matchFound.playerTwoId;
  }

  validate(sideToMove: Side, move: string): boolean {
    if (sideToMove !== this.sideToMove) {
      return false;
    }

    this.updateState(move);
    return true;
  }

  private updateState(move: string): void {
    this.moveHistory.push(move);
    this.sideToMove = this.sideToMove === "white" ? "black" : "white";
  }
}
