import db from "../configs/db.js";

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

    db.prepare(
      `
        INSERT INTO matches (id, player_white, player_black)
        VALUES (?, ?, ?)`,
    ).run(this.id, this.playerWhiteId, this.playerBlackId);
  }

  updateMatchState(newMove: string): void {
    this.turn = this.turn === "white" ? "black" : "white";
    this.moves.push(newMove);
  }
}
