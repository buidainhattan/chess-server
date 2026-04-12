import { MATCH_STATUS, SIDE, type MATCH_RESULT } from "../constants/enums.js";

export interface Player {
  playerId: string | null;
}

export class Match {
  public id: string;
  private playerIds: Set<string>;
  public playerWhiteId: string;
  public playerBlackId: string;
  private status: MATCH_STATUS;
  public turn: SIDE;
  public winner: SIDE;
  public result: MATCH_RESULT | null;
  public moves: string[];
  private endConfirmations: Set<string>;
  public startedAt: string;
  public endedAt: string | null;

  constructor(
    matchId: string,
    whiteId: string,
    blackId: string,
    matchStatus: MATCH_STATUS,
  ) {
    this.id = matchId;
    this.playerIds = new Set([whiteId, blackId]);
    this.playerWhiteId = whiteId;
    this.playerBlackId = blackId;
    this.status = matchStatus;
    this.turn = SIDE.WHITE;
    this.winner = SIDE.NONE;
    this.result = null;
    this.moves = [];
    this.endConfirmations = new Set();
    this.startedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
    this.endedAt = null;
  }

  hasPlayer(playerId: string): boolean {
    return this.playerIds.has(playerId);
  }

  updateStatus(newMove: string): void {
    this.turn = this.turn === SIDE.WHITE ? SIDE.BLACK : SIDE.WHITE;
    this.moves.push(newMove);
  }

  confirmEnd(playerId: string): void {
    this.endConfirmations.add(playerId);
  }

  isEndConfirmed(): boolean {
    return this.endConfirmations.size === 2;
  }

  end(winnerSide: SIDE, result: MATCH_RESULT) {
    this.status = MATCH_STATUS.ENDED;
    this.winner = winnerSide;
    this.result = result;
    this.endedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
  }
}

export interface MatchResult {
  winner: string;
  result: string;
}
