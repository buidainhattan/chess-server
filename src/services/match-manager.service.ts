import type { Room } from "../models/match-making.model.js";
import type { Match } from "../models/match.model.js";

const activeMatches = new Map<string, Match>();
const privateRooms = new Map<string, Room>();

// <======== Manage active matches ========>
export function setActiveMatch(matchId: string, match: Match) {
  activeMatches.set(matchId, match);
}

export function getActiveMatch(matchId: string): Match | undefined {
  return activeMatches.get(matchId);
}

export function removeActiveMatch(matchId: string): boolean {
  return activeMatches.delete(matchId);
}

// <======== Manage private rooms ========>
export function setPrivateRoom(code: string, room: Room) {
  privateRooms.set(code, room);
}

export function getPrivateRoom(code: string): Room | undefined {
  return privateRooms.get(code);
}

export function removePrivateRoom(code: string): boolean {
  return privateRooms.delete(code);
}
