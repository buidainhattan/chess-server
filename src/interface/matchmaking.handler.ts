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

    const { alreadyQueued: alreadyQueued } =
      await matchmakingService.joinQueue(playerId);
    if (alreadyQueued) {
      socket.emit("matchmaking:rejected", { message: "Already in queue" });
      return;
    }

    socket.emit("matchmaking:joined");

    const matchFoundEvent = await matchmakingService.matchmaking(playerId);

    if (matchFoundEvent) {
      onMatchFoundEvent(io, matchFoundEvent);
    }
  });

  socket.on("matchmaking:leave", async () => {
    const playerId = socket.data.playerId as string;
    await matchmakingService.leaveQueue(playerId);
    socket.emit("matchmaking:left");
  });

  socket.on("disconnect", async () => {
    const playerId = socket.data.playerId as string;
    await matchmakingService.leaveQueue(playerId);
  });
}

function onMatchFoundEvent(io: Server, matchFoundEvent: MatchFound): void {
  const playerIds = [matchFoundEvent.playerOneId, matchFoundEvent.playerTwoId];
  const matchFoundPayload = JSON.stringify(matchFoundEvent);

  for (const playerId of playerIds) {
    io.to(playerId).emit("matchmaking:match-found", matchFoundPayload);
  }
}
