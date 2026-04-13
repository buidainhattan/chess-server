import type { Match } from "../models/match.interface.js";
import db from "./db.js";

export function insertMatch(match: Match): void {
  db.prepare(
    `
    INSERT INTO matches (id, player_white, player_black, winner, result, moves, started_at, ended_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run([
    match.id,
    match.playerWhiteId,
    match.playerBlackId,
    match.winner,
    match.result,
    JSON.stringify(match.moves),
    match.startedAt,
    match.endedAt,
  ]);
}
