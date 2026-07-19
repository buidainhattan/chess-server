import { Chess } from "chess.js";
import type { MatchFound } from "../shared/match-found.event.js";
import type { Side } from "../shared/type/side.type.js";
import type { MatchStatus } from "../shared/type/match-status.type.js";

export class ActiveMatch {
  readonly id: string;
  readonly playerOneId: string;
  readonly playerTwoId: string;
  sideToMove: Side = "white";
  moveHistory: string[] = [];
  status: MatchStatus = "ongoing";
  winner: Side | null = null;
  startAt: Date = new Date();

  // Internal non-serializable engine state
  private _chess: Chess | null = null;

  constructor(matchFound: MatchFound) {
    this.id = matchFound.id;
    this.playerOneId = matchFound.playerOneId;
    this.playerTwoId = matchFound.playerTwoId;
  }

  validate(playerId: string, move: string): boolean {
    if (this.status !== "ongoing") {
      return false;
    }

    if (!this.validateIdentity(playerId)) {
      return false;
    }

    if (!this.validateMove(move)) {
      return false;
    }

    this.applyMove(move);
    return true;
  }

  resign(playerId: string): boolean {
    if (this.status !== "ongoing") {
      return false;
    }

    let resigningSide: Side;
    if (playerId === this.playerOneId) {
      resigningSide = "white";
    } else if (playerId === this.playerTwoId) {
      resigningSide = "black";
    } else {
      return false;
    }

    this.status = "resign";
    this.winner = resigningSide === "white" ? "black" : "white";
    return true;
  }

  private validateIdentity(playerId: string): boolean {
    const expectedPlayerId =
      this.sideToMove === "white" ? this.playerOneId : this.playerTwoId;
    return playerId === expectedPlayerId;
  }

  private validateMove(move: string): boolean {
    try {
      const chess = this.getOrHydrateChessEngine();

      // Test the move validation non-destructively
      const validMove = chess.move(move);
      if (!validMove) return false;

      // Undo immediately so applyMove handles the absolute state change
      chess.undo();
      return true;
    } catch {
      return false;
    }
  }

  private applyMove(move: string): void {
    const chess = this.getOrHydrateChessEngine();

    // Commit to the long-lived chess instance
    chess.move(move);

    // Commit to serializable tracking fields
    this.moveHistory.push(move);

    // Determine terminal state before changing sideToMove
    this.matchEnd(chess);

    if (this.status === "ongoing") {
      this.sideToMove = this.sideToMove === "white" ? "black" : "white";
    }
  }

  private matchEnd(chess: Chess): void {
    const nextStatus = this.checkMatchStatus(chess);

    if (nextStatus !== "ongoing") {
      this.status = nextStatus;
      if (nextStatus === "checkmate") {
        this.winner = chess.turn() === "w" ? "black" : "white";
      }
    }
  }

  private checkMatchStatus(chess: Chess): MatchStatus {
    if (chess.isCheckmate()) {
      return "checkmate";
    }

    if (chess.isStalemate()) {
      return "stalemate";
    }

    if (chess.isThreefoldRepetition()) {
      return "three-fold-repetitions";
    }

    if (chess.isInsufficientMaterial()) {
      return "insufficient-material";
    }

    return "ongoing";
  }

  private getOrHydrateChessEngine(): Chess {
    if (!this._chess) {
      this._chess = new Chess();
    }

    // If engine history is 0, it's either a brand new game or a freshly hydrated entity from Redis
    if (this._chess.history().length === 0) {
      for (const historicalMove of this.moveHistory) {
        this._chess.move(historicalMove);
      }
    }

    return this._chess;
  }
}
