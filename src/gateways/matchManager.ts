import { randomUUID } from "crypto";
import db from "../configs/db.js";
import { Match } from "../models/match.js";
import { MATCH_MAKING_STATUS } from "../constants/enums.js";
import { Socket, Server } from "socket.io";

interface WaitingPlayer {
  socketId: string | null;
}

interface Room {
  hostId: string;
}

const waitingPlayer: WaitingPlayer = { socketId: null };
const activeMatches = new Map<string, Match>();
const privateRooms = new Map<string, Room>();

export function handleConnection(socket: Socket, io: Server) {
  socket.on("join_match_making", () => {
    if (waitingPlayer.socketId === null) {
      waitingPlayer.socketId = socket.id;
      socket.emit("waiting", {
        message: "waiting for opponent...",
        status: MATCH_MAKING_STATUS.SEARCHING,
      });
    } else {
      const matchId = randomUUID();

      const match = new Match(matchId, waitingPlayer.socketId, socket.id);

      activeMatches.set(matchId, match);

      io.sockets.sockets.get(waitingPlayer.socketId)?.join(matchId);
      socket.join(matchId);

      io.to(matchId).emit("match_start", {
        ...match,
        status: MATCH_MAKING_STATUS.MATCH_FOUND,
      });

      waitingPlayer.socketId = null;
    }
  });

  socket.on("leave_match_making", () => {
    if (socket.id !== waitingPlayer.socketId) {
      socket.emit("error", { message: "this is not a waiting player" });
      return;
    }

    waitingPlayer.socketId = null;
    socket.emit("end_waiting", { message: " stop waiting for opponent" });
  });

  socket.on("create_room", () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    privateRooms.set(code, { hostId: socket.id });
    socket.emit("room_created", { code });
  });

  socket.on("join_room", ({ code }: { code: string }) => {
    const room = privateRooms.get(code);

    if (!room) {
      socket.emit("error", { message: "room not found" });
      return;
    }

    if (room.hostId === socket.id) {
      socket.emit("error", { message: "cannot join your own room" });
      return;
    }

    privateRooms.delete(code);

    const matchId = randomUUID();
    const match = new Match(matchId, room.hostId, socket.id);

    activeMatches.set(matchId, match);

    socket.join(matchId);
    io.sockets.sockets.get(room.hostId)?.join(matchId);

    io.to(matchId).emit("match_start", match);
  });

  socket.on("move", ({ matchId, move }: { matchId: string; move: any }) => {
    const match = activeMatches.get(matchId);

    if (!match) {
      socket.emit("error", { message: "match not found" });
      return;
    }

    const playerColor = match.playerWhiteId === socket.id ? "white" : "black";

    if (playerColor !== match.turn) {
      socket.emit("error", { message: "not your turn" });
      return;
    }

    match.updateMatchState(move);
    socket.to(matchId).emit("opponent_move", { move });
  });

  socket.on("resign", ({ matchId }: { matchId: string }) => {
    const match = activeMatches.get(matchId);
    if (!match) return;

    const winner = socket.id === match.playerWhiteId ? "black" : "white";
    endMatch(matchId, winner, io);
  });

  socket.on("disconnect", () => {
    for (const [matchId, match] of activeMatches) {
      if (
        match.playerWhiteId === socket.id ||
        match.playerBlackId === socket.id
      ) {
        const winner = match.playerWhiteId === socket.id ? "black" : "white";
        endMatch(matchId, winner, io);
        break;
      }
    }

    if (waitingPlayer.socketId === socket.id) {
      waitingPlayer.socketId = null;
    }

    for (const [code, room] of privateRooms) {
      if (room.hostId === socket.id) {
        privateRooms.delete(code);
        break;
      }
    }
  });
}

function endMatch(matchId: string, result: string, io: Server) {
  const match = activeMatches.get(matchId);
  if (!match) return;

  db.prepare(
    `
    UPDATE matches
    SET result = ?, moves = ?, ended_at = unixepoch()
    WHERE id = ?
  `,
  ).run(result, JSON.stringify(match.moves), matchId);

  io.to(matchId).emit("match_end", { result });
  activeMatches.delete(matchId);
}
