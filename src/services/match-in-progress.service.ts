import { MatchResultSchema, SIDE, SideSchema } from "../constants/enums.js";
import type { MatchResult } from "../models/match.model.js";
import { insertMatch } from "../repositories/match.repository.js";
import { getActiveMatch, removeActiveMatch } from "./match-manager.service.js";

export function makeMove(
  matchId: string,
  playerId: string,
  move: string,
): string | null {
  const match = getActiveMatch(matchId);

  if (!match) {
    return "match not found";
  }

  const playerColor =
    playerId === match.playerWhiteId ? SIDE.WHITE : SIDE.BLACK;

  if (playerColor !== match.turn) {
    return "not your turn";
  }

  match.updateStatus(move);
  return null;
}

export function endMatch(
  matchId: string,
  resultData: MatchResult,
): string | void {
  const match = getActiveMatch(matchId);
  if (!match) {
    return "match not found";
  }

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
}
