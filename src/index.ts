import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { EventEmitter } from "events";

import { InMemoryMatchmakingRepo } from "./infrastructure/in-memory-matchmaking.repo.js";
import { MatchmakingService } from "./application/matchmaking.service.js";
import { registerMatchmakingHandler } from "./interface/matchmaking.handler.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const eventEmitter = new EventEmitter();

// --- Composition root: wire dependencies ---
const matchmakingRepo = new InMemoryMatchmakingRepo();
const matchmakingService = new MatchmakingService(
  matchmakingRepo,
  eventEmitter,
);

// --- Socket.io auth middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    // replace with real JWT verification
    const playerId = verifyToken(token);
    socket.data.playerId = playerId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// --- Register handlers per connection ---
io.on("connection", (socket) => {
  registerMatchmakingHandler(io, socket, matchmakingService, eventEmitter);
});

// --- Start server ---
const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function verifyToken(token: string): string {
  // stub — swap in jsonwebtoken or your auth lib here
  return token;
}
