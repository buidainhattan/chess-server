import type { MatchFound } from "../matchmaking/match-found.event.js";
import type { Side } from "../shared/side.type.js";

export class ActiveMatch {
  constructor(readonly matchFound: MatchFound) {}
  sideToMove: Side = "white";
  moveHistory: string[] = [];

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
