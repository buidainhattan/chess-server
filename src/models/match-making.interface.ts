import type { Match } from "../entities/Match.entity.js";

export interface Room {
  hostId: string;
}

export type JoinResult = JoinInSuccess | JoinSuccess;

interface JoinInSuccess {
  success: false;
  message?: string;
}

interface JoinSuccess {
  success: true;
  hostId: string;
  match: Match;
}
