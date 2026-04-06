export interface Player {
  playerId: string | null;
}

export class Match {
  public id: string;
  public playerWhiteId: string;
  public playerBlackId: string;
  public turn: "white" | "black";
  public moves: string[];

  constructor(matchId: string, whiteId: string, blackId: string) {
    this.id = matchId;
    this.playerWhiteId = whiteId;
    this.playerBlackId = blackId;
    this.turn = "white";
    this.moves = [];
  }

  updateMatchState(newMove: string): void {
    this.turn = this.turn === "white" ? "black" : "white";
    this.moves.push(newMove);
  }
}

export interface MatchResult {
  winner: string;
  result: string;
}
