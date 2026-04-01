import type { Match } from "./match.model.js";

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
