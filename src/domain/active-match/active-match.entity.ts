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

  // Clock metrics (Time Control: defaults to 5 minutes / 300000 ms per player)
  whiteTimeLeftMs: number = 300000;
  blackTimeLeftMs: number = 300000;
  lastMoveAt: Date = new Date();

  private _chess: Chess | null = null;

  constructor(matchFound: MatchFound) {
    this.id = matchFound.id;
    this.playerOneId = matchFound.playerOneId;
    this.playerTwoId = matchFound.playerTwoId;
    this.lastMoveAt = this.startAt;
  }

  validate(playerId: string, move: string): boolean {
    if (this.status !== "ongoing") {
      return false;
    }

    if (!this.validateIdentity(playerId)) {
      return false;
    }

    // Run the private time validation check first
    if (!this.checkTime()) {
      return false;
    }

    if (!this.validateMove(move)) {
      return false;
    }

    this.applyMove(move);
    return true;
  }

  // Explicit timeout check method exposed for passive system/client ticks
  forceTimeoutCheck(): boolean {
    if (this.status !== "ongoing") {
      return false;
    }
    return !this.checkTime();
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

  private checkTime(): boolean {
    const now = new Date();
    const elapsedMs = now.getTime() - this.lastMoveAt.getTime();

    if (this.sideToMove === "white") {
      this.whiteTimeLeftMs -= elapsedMs;
      if (this.whiteTimeLeftMs <= 0) {
        this.whiteTimeLeftMs = 0;
        this.status = "timeout";
        this.winner = "black";
        return false;
      }
    } else {
      this.blackTimeLeftMs -= elapsedMs;
      if (this.blackTimeLeftMs <= 0) {
        this.blackTimeLeftMs = 0;
        this.status = "timeout";
        this.winner = "white";
        return false;
      }
    }

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
      const validMove = chess.move(move);
      if (!validMove) return false;

      chess.undo();
      return true;
    } catch {
      return false;
    }
  }

  private applyMove(move: string): void {
    const chess = this.getOrHydrateChessEngine();
    chess.move(move);
    this.moveHistory.push(move);

    this.matchEnd(chess);

    this.lastMoveAt = new Date();

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
    if (chess.isCheckmate()) return "checkmate";
    if (chess.isStalemate()) return "stalemate";
    if (chess.isThreefoldRepetition()) return "three-fold-repetitions";
    if (chess.isInsufficientMaterial()) return "insufficient-material";
    return "ongoing";
  }

  private getOrHydrateChessEngine(): Chess {
    if (!this._chess) {
      this._chess = new Chess();
    }

    if (this._chess.history().length === 0) {
      for (const historicalMove of this.moveHistory) {
        this._chess.move(historicalMove);
      }
    }

    return this._chess;
  }
}
