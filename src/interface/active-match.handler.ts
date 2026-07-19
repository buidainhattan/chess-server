import type { Server, Socket } from "socket.io";
import type { ActiveMatchService } from "../application/active-match.service.js";
import type { Side } from "../domain/shared/type/side.type.js";

export function registerActiveMatchHandler(
  io: Server,
  socket: Socket,
  activeMatchService: ActiveMatchService,
): void {
  socket.on(
    "active-match:make-move",
    async (payload: { matchId: string; sideToMove: string; move: string }) => {
      const { matchId, sideToMove, move } = payload;
      const playerId = socket.data.playerId as string;

      const result = await activeMatchService.makeMove(
        matchId,
        sideToMove as Side,
        move,
      );

      if (!result.completed) {
        socket.emit("active-match:error", { message: "Invalid move or turn" });
        return;
      }

      // Broadcast the updated state to the match room
      io.to(`match:${matchId}`).emit("active-match:move-made", {
        matchId,
        playerId,
        move,
      });
    },
  );

  // When a player connects or starts a match, make sure they join their match room
  socket.on("active-match:join-room", (payload: { matchId: string }) => {
    socket.join(`match:${payload.matchId}`);
  });
}
