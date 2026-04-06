import { MatchResultSchema, SideSchema } from "../constants/enums.js";
import type { MatchResult } from "../models/match.model.js";
import { updateMatchResult } from "../repositories/match.repository.js";
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

  const playerColor = playerId === match.playerWhiteId ? "white" : "black";

  if (playerColor !== match.turn) {
    return "not your turn";
  }

  match.updateMatchState(move);
  return null;
}

export function matchEnded(
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

  updateMatchResult(winner.data, match, result.data);
  removeActiveMatch(matchId);
}
