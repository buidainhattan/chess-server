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
  timeLeftMs: Record<Side, number> = { white: 300000, black: 300000 };
  lastMoveAt: Date = new Date();

  private _chess: Chess | null = null;

  constructor(matchFound: MatchFound, initialTime?: number) {
    this.id = matchFound.id;
    this.playerOneId = matchFound.playerOneId;
    this.playerTwoId = matchFound.playerTwoId;

    if (initialTime) {
      this.timeLeftMs = { white: initialTime, black: initialTime };
    }
  }

  validate(playerId: string, move: string): boolean {
    if (!this.isOngoing()) {
      return false;
    }

    if (!this.validateIdentity(playerId)) {
      return false;
    }

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
    if (!this.isOngoing()) {
      return false;
    }
    return !this.checkTime();
  }

  resign(playerId: string): boolean {
    if (!this.isOngoing()) {
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

  // <========== IMPORTANT INSTANCE PRIVATE METHOD ==========>

  private checkTime(): boolean {
    const now = new Date();
    const elapsedMs = now.getTime() - this.lastMoveAt.getTime();
    const side = this.sideToMove;

    this.timeLeftMs[side] -= elapsedMs;
    if (this.timeLeftMs[side] <= 0) {
      this.timeLeftMs[side] = 0;
      this.status = "timeout";
      this.winner = this.opposite(side);
      return false;
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
      return !!chess.move(move); // no undo — kept if legal, never applied if not
    } catch {
      return false;
    }
  }

  private applyMove(move: string): void {
    const chess = this.getOrHydrateChessEngine(); // already has the move applied
    this.moveHistory.push(move);

    this.matchEnd(chess);

    this.lastMoveAt = new Date();

    if (this.isOngoing()) {
      this.sideToMove = this.opposite(this.sideToMove);
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

  // <========== HELPER PRIVATE METHODS ==========>

  private isOngoing(): boolean {
    return this.status === "ongoing";
  }

  private opposite(side: Side): Side {
    return side === "white" ? "black" : "white";
  }
}
