import { MatchResultSchema, SIDE, SideSchema } from "../models/enums.js";
import type { MatchResult } from "../models/match.interface.js";
import { insertMatch } from "../repositories/match.repository.js";
import { getActiveMatch, removeActiveMatch } from "./match-manager.service.js";

export function makeMove(
  matchId: string,
  playerId: string,
  move: string,
): string | void {
  try {
    const match = getActiveMatch(matchId);

    const playerColor =
      playerId === match.playerWhiteId ? SIDE.WHITE : SIDE.BLACK;

    if (playerColor !== match.turn) {
      return "not your turn";
    }

    match.updateStatus(move);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "unkown error from makeMove function";
  }
}

export function confirmEnd(matchId: string, socketId: string): string | void {
  try {
    const match = getActiveMatch(matchId);
    match.confirmEnd(socketId);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "unkown error from confirmEnd function";
  }
}

export function hasAllConfirmed(matchId: string): string | boolean {
  try {
    const match = getActiveMatch(matchId);
    return match.isEndConfirmed();
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "unkown error from hasAllConfirmed function";
  }
}

export function endMatch(
  matchId: string,
  resultData: MatchResult,
): string | void {
  try {
    const match = getActiveMatch(matchId);

    const winner = SideSchema.safeParse(resultData.winner);
    if (!winner.success) {
      return "Invalid winner side";
    }
    const result = MatchResultSchema.safeParse(resultData.result);
    if (!result.success) {
      return "Invalid match result";
    }
    match.end(winner.data, result.data);

    insertMatch(match);

    removeActiveMatch(matchId);
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "unkown error from endMatch function";
  }
}
