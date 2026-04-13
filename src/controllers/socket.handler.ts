import { Socket, Server } from "socket.io";

import { MATCH_MAKING_STATUS } from "../models/enums.js";
import {
  createRoom,
  joinMatchMaking,
  joinRoom,
  leaveMatchMaking,
} from "../services/match-making.service.js";
import {
  makeMove,
  endMatch,
  confirmEnd,
  hasAllConfirmed,
} from "../services/match-in-progress.service.js";
import type { MatchResult } from "../models/match.interface.js";

export function handleConnection(socket: Socket, io: Server) {
  socket.on("join_match_making", () => {
    const match = joinMatchMaking(socket.id);

    if (match === null) {
      socket.emit("waiting", {
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

    socket.emit("end_waiting", { status: MATCH_MAKING_STATUS.CANCELLED });
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

  socket.on(
    "make_move",
    ({ matchId, move }: { matchId: string; move: string }) => {
      const result = makeMove(matchId, socket.id, move);

      if (result) {
        socket.emit("error", { message: result });
        return;
      }

      socket.to(matchId).emit("opponent_move", { move });
    },
  );

  socket.on(
    "match_ended",
    ({
      matchId,
      winner,
      result,
    }: {
      matchId: string;
      winner: string;
      result: string;
    }) => {
      const confirm = confirmEnd(matchId, socket.id);

      if (confirm) {
        socket.emit("error", { message: confirm });
        return;
      }

      if (!hasAllConfirmed(matchId)) {
        return;
      }

      const matchResult: MatchResult = { winner, result };
      const endedResult = endMatch(matchId, matchResult);
      if (endedResult) {
        socket.emit("error", { message: endedResult });
        return;
      }
    },
  );

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
