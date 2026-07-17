import { Server, Socket } from "socket.io";
import { EventEmitter } from "events";
import { MatchmakingService } from "../application/matchmaking.service.js";
import { MatchFound } from "../domain/matchmaking/match-found.event.js";

export function registerMatchmakingHandler(
  io: Server,
  socket: Socket,
  matchmakingService: MatchmakingService,
  eventEmitter: EventEmitter,
): void {
  socket.on("matchmaking:join", async () => {
    const playerId = socket.data.playerId as string;

    const { queueing: queueing } = await matchmakingService.joinQueue(playerId);
    if (queueing) {
      socket.emit("matchmaking:error", { message: "Already in queue" });
      return;
    }

    socket.emit("matchmaking:joined");
  });

  socket.on("matchmaking:leave", async () => {
    const playerId = socket.data.playerId as string;
    await matchmakingService.leaveQueue(playerId);
    socket.emit("matchmaking:left");
  });

  const onMatchFound = (event: MatchFound) => {
    if (
      event.playerOneId !== socket.data.playerId &&
      event.playerTwoId !== socket.data.playerId
    ) {
      return;
    }

    socket.emit("matchmaking:match-found", {
      matchmakingId: event.matchmakingId,
      playerOneId: event.playerOneId,
      playerTwoId: event.playerTwoId,
      foundAt: event.foundAt,
    });
  };
  eventEmitter.on(MatchFound.NAME, onMatchFound);

  socket.on("disconnect", async () => {
    const playerId = socket.data.playerId as string;
    await matchmakingService.leaveQueue(playerId);
    eventEmitter.off(MatchFound.NAME, onMatchFound);
  });
}
