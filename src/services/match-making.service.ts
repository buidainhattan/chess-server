import { randomUUID } from "crypto";
import { type Player } from "../models/match.interface.js";
import type { JoinResult } from "../models/match-making.interface.js";
import {
  getPrivateRoom,
  removePrivateRoom,
  setActiveMatch,
  setPrivateRoom,
} from "./match-manager.service.js";
import { MATCH_STATUS } from "../models/enums.js";
import { Match } from "../entities/Match.entity.js";

const waitingPlayer: Player = { playerId: null };

export function joinMatchMaking(socketId: string): Match | null {
  if (waitingPlayer.playerId === null) {
    waitingPlayer.playerId = socketId;
    return null; // null signals "still waiting"
  }

  const matchId = randomUUID();
  const match = new Match(
    matchId,
    waitingPlayer.playerId,
    socketId,
    MATCH_STATUS.ONGOING,
  );

  setActiveMatch(matchId, match);

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

  setPrivateRoom(code, {
    hostId: socketId,
  });

  return code;
}

export function joinRoom(socketId: string, code: string): JoinResult {
  try {
    const room = getPrivateRoom(code);

    if (room.hostId === socketId) {
      return { success: false, message: "can't join your own room" };
    }

    removePrivateRoom(code);

    const matchId = randomUUID();
    const match = new Match(
      matchId,
      room!.hostId,
      socketId,
      MATCH_STATUS.ONGOING,
    );

    setActiveMatch(matchId, match);

    return { success: true, hostId: room.hostId, match: match };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "unkown error in joinRoom function",
    };
  }
}
