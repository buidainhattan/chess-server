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
