import { randomUUID } from "crypto";
import { Match, type Player } from "../models/match.model.js";
import { insertMatch } from "../repositories/match.repository.js";
import type { JoinResult, Room } from "../models/match-making.model.js";

const waitingPlayer: Player = { playerId: null };
const activeMatches = new Map<string, Match>();
const privateRooms = new Map<string, Room>();

export function joinMatchMaking(socketId: string): Match | null {
  if (waitingPlayer.playerId === null) {
    waitingPlayer.playerId = socketId;
    return null; // null signals "still waiting"
  }

  const matchId = randomUUID();
  const match = new Match(matchId, waitingPlayer.playerId, socketId);

  activeMatches.set(matchId, match);
  insertMatch(match);

  waitingPlayer.playerId = null;
  return match; // match signals "game found"
}

export function leaveMatchMaking(socketId: string): boolean {
  if (waitingPlayer.playerId != socketId) {
    return false;
  }

  waitingPlayer.playerId = null;
  return true;
}

export function createRoom(socketId: string): string {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  privateRooms.set(code, {
    hostId: socketId,
  });
  return code;
}

export function joinRoom(socketId: string, code: string): JoinResult {
  const room = privateRooms.get(code);

  if (!room) {
    return { success: false, message: "room not found" };
  }

  if (room.hostId === socketId) {
    return { success: false, message: "can't join your own room" };
  }

  privateRooms.delete(code);

  const matchId = randomUUID();
  const match = new Match(matchId, room!.hostId, socketId);
  activeMatches.set(matchId, match);

  return { success: true, hostId: room.hostId, match: match };
}

export function makeMove(
  matchId: string,
  playerId: string,
  move: string,
): string | null {
  const match = activeMatches.get(matchId);

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
