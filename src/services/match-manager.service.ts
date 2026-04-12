import type { Room } from "../models/match-making.model.js";
import type { Match } from "../models/match.model.js";

const activeMatches = new Map<string, Match>();
const privateRooms = new Map<string, Room>();

// <======== Manage active matches ========>
export function setActiveMatch(matchId: string, match: Match): void {
  activeMatches.set(matchId, match);
}

export function getActiveMatch(matchId: string): Match {
  const match = activeMatches.get(matchId);

  if (!match) {
    throw new Error("match not found");
  }

  return match;
}

export function removeActiveMatch(matchId: string): boolean {
  return activeMatches.delete(matchId);
}

// <======== Manage private rooms ========>
export function setPrivateRoom(code: string, room: Room): void {
  privateRooms.set(code, room);
}

export function getPrivateRoom(code: string): Room {
  const privateRoom = privateRooms.get(code);

  if (!privateRoom) {
    throw new Error("room not found");
  }

  return privateRoom;
}

export function removePrivateRoom(code: string): boolean {
  return privateRooms.delete(code);
}
