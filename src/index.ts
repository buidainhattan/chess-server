import express, { type Request, type Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

import { handleConnection } from "./gateways/matchManager.js";
import statRouter from "./routes/stats.js";

const app = express();
const httpServer = createServer(app);

const io: Server = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());

app.use("/stat", statRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ status: "chess server is running" });
});

io.on("connection", (socket: Socket) => {
  console.log(`socket connected: ${socket.id}`);

  handleConnection(socket, io);

  socket.on("disconnect", () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});
