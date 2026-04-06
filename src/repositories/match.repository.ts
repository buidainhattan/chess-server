import type { Match } from "../models/match.model.js";
import db from "../db/db.js";

export function insertMatch(match: Match): void {
  db.prepare(
    `
    INSERT INTO matches (id, player_white, player_black)
    VALUES (?, ?, ?)
    `,
  ).run(match.id, match.playerWhiteId, match.playerBlackId);
}

export function updateMatchResult(
  winner: string,
  match: Match,
  result: string,
): void {
  db.prepare(
    `
    UPDATE matches
    SET winner = ?, result = ?, moves = ?, ended_at = datetime('now')
    WHERE matchId = ?;
    `,
  ).run(
    winner.toLowerCase(),
    result.toLowerCase(),
    JSON.stringify(match.moves),
    match.id,
  );
}
