import { MATCH_MAKING_STATUS } from "../constants/enums.js";
import { Socket, Server } from "socket.io";
import {
  createRoom,
  joinMatchMaking,
  joinRoom,
  leaveMatchMaking,
} from "../services/match-making.service.js";

export function handleConnection(socket: Socket, io: Server) {
  socket.on("join_match_making", () => {
    const match = joinMatchMaking(socket.id);

    if (match === null) {
      socket.emit("waiting", {
        message: "waiting for opponent...",
        status: MATCH_MAKING_STATUS.SEARCHING,
      });
      return;
    }

    io.sockets.sockets.get(match.playerWhiteId)?.join(match.id);
    socket.join(match.id);

    io.to(match.id).emit("match_start", {
      ...match,
      status: MATCH_MAKING_STATUS.MATCH_FOUND,
    });
  });

  socket.on("leave_match_making", () => {
    const isSuccess = leaveMatchMaking(socket.id);

    if (!isSuccess) {
      socket.emit("error", { message: "this is not a waiting player" });
      return;
    }

    socket.emit("end_waiting", { message: "stop waiting for opponent" });
  });

  socket.on("create_room", () => {
    const code = createRoom(socket.id);
    socket.emit("room_created", { code });
  });

  socket.on("join_room", ({ code }: { code: string }) => {
    const result = joinRoom(socket.id, code);

    if (!result.success) {
      socket.emit("error", result.message);
      return;
    }

    const matchId = result.match.id;
    socket.join(matchId);
    io.sockets.sockets.get(result.hostId)?.join(matchId);
    io.to(matchId).emit("match_start", result.match);
  });

  // socket.on("move", ({ matchId, move }: { matchId: string; move: any }) => {
  //   const match = activeMatches.get(matchId);

  //   if (!match) {
  //     socket.emit("error", { message: "match not found" });
  //     return;
  //   }

  //   const playerColor = match.playerWhiteId === socket.id ? "white" : "black";

  //   if (playerColor !== match.turn) {
  //     socket.emit("error", { message: "not your turn" });
  //     return;
  //   }

  //   match.updateMatchState(move);
  //   socket.to(matchId).emit("opponent_move", { move });
  // });

  // socket.on("resign", ({ matchId }: { matchId: string }) => {
  //   const match = activeMatches.get(matchId);
  //   if (!match) return;

  //   const winner = socket.id === match.playerWhiteId ? "black" : "white";
  //   endMatch(matchId, winner, io);
  // });

  // socket.on("disconnect", () => {
  //   for (const [matchId, match] of activeMatches) {
  //     if (
  //       match.playerWhiteId === socket.id ||
  //       match.playerBlackId === socket.id
  //     ) {
  //       const winner = match.playerWhiteId === socket.id ? "black" : "white";
  //       endMatch(matchId, winner, io);
  //       break;
  //     }
  //   }

  //   if (waitingPlayer.playerId === socket.id) {
  //     waitingPlayer.playerId = null;
  //   }

  //   for (const [code, room] of privateRooms) {
  //     if (room.hostId === socket.id) {
  //       privateRooms.delete(code);
  //       break;
  //     }
  //   }
  // });
}

// function endMatch(matchId: string, result: string, io: Server) {
//   const match = activeMatches.get(matchId);
//   if (!match) return;

//   db.prepare(
//     `
//     UPDATE matches
//     SET result = ?, moves = ?, ended_at = unixepoch()
//     WHERE id = ?
//   `,
//   ).run(result, JSON.stringify(match.moves), matchId);

//   io.to(matchId).emit("match_end", { result });
//   activeMatches.delete(matchId);
// }
