import { describe, it, expect, jest } from "@jest/globals";
import { EventEmitter } from "events";
import { ActiveMatchService } from "../application/active-match.service.js";
import { InMemoryActiveMatchRepo } from "../infrastructure/in-memory-active-match.repo.js";
import { RedisActiveMatchRepo } from "../infrastructure/redis-active-match.repo.js";
import { MatchFound } from "../domain/shared/match-found.event.js";

function makeService() {
  const mockRedisRepo = {
    saveActiveMatch: jest.fn<() => Promise<void>>(),
    updateActiveMatchState: jest.fn<() => Promise<void>>(),
    deleteActiveMatch: jest.fn<() => Promise<void>>(),
    findActiveMatchById: jest.fn<() => Promise<null>>().mockResolvedValue(null),
  } as unknown as RedisActiveMatchRepo;

  const repo = new InMemoryActiveMatchRepo(mockRedisRepo);
  const eventEmitter = new EventEmitter();
  const service = new ActiveMatchService(repo, eventEmitter);

  return { repo, eventEmitter, service, mockRedisRepo };
}

describe("ActiveMatchService", () => {
  describe("initializeMatch (via MatchFound event)", () => {
    it("should initialize and save a new active match when MatchFound is emitted", async () => {
      const { repo, eventEmitter } = makeService();
      const event = new MatchFound("match-1", "player-1", "player-2");

      eventEmitter.emit(MatchFound.NAME, event);
      await new Promise(process.nextTick);

      const activeMatch = await repo.findActiveMatchById("match-1");
      expect(activeMatch).not.toBeNull();
      expect(activeMatch?.id).toBe("match-1");
    });
  });

  describe("makeMove", () => {
    it("should return completed false if the match does not exist", async () => {
      const { service } = makeService();
      const result = await service.makeMove(
        "non-existent-id",
        "player-1",
        "e4",
      );
      expect(result.completed).toBe(false);
    });

    it("should successfully progress the match when a valid move is made", async () => {
      const { repo, eventEmitter, service } = makeService();
      const event = new MatchFound("match-1", "player-1", "player-2");

      eventEmitter.emit(MatchFound.NAME, event);
      await new Promise(process.nextTick);

      const result = await service.makeMove("match-1", "player-1", "e4");

      expect(result.completed).toBe(true);
      const updatedMatch = await repo.findActiveMatchById("match-1");
      expect(updatedMatch?.sideToMove).toBe("black");
      expect(updatedMatch?.moveHistory).toContain("e4");
    });

    describe("validation", () => {
      it("should reject a move if it is not the active side's player ID", async () => {
        const { eventEmitter, service } = makeService();
        const event = new MatchFound("match-1", "player-1", "player-2");

        eventEmitter.emit(MatchFound.NAME, event);
        await new Promise(process.nextTick);

        const result = await service.makeMove("match-1", "player-2", "e5");

        expect(result.completed).toBe(false);
      });

      it("should reject a completely invalid chess move syntax or illegal rule execution", async () => {
        const { eventEmitter, service } = makeService();
        const event = new MatchFound("match-1", "player-1", "player-2");

        eventEmitter.emit(MatchFound.NAME, event);
        await new Promise(process.nextTick);

        const result = await service.makeMove("match-1", "player-1", "e5");

        expect(result.completed).toBe(false);
      });

      it("should catch up the long-lived engine on a fresh instantiation during a repository cache miss", async () => {
        const { repo, mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const reconstructedMatch = new ActiveMatch(hydratedEvent);
        reconstructedMatch.moveHistory = ["e4", "e5"];
        reconstructedMatch.sideToMove = "white";

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(reconstructedMatch);

        const result = await service.makeMove("match-1", "player-1", "Nf3");

        expect(result.completed).toBe(true);
        const matchState = await repo.findActiveMatchById("match-1");
        expect(matchState?.moveHistory).toEqual(["e4", "e5", "Nf3"]);
      });
    });

    describe("game resolution states", () => {
      it("should transition status to checkmate and delete match when terminal move is played", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        // Fool's Mate setup: White is about to get checkmated by Black's Queen
        match.moveHistory = ["f3", "e5", "g4"];
        match.sideToMove = "black";

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.makeMove("match-1", "player-2", "Qh4#");

        expect(result.completed).toBe(true);
        expect(match.status).toBe("checkmate");
        expect(match.winner).toBe("black");
        expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
      });

      it("should transition status to stalemate and delete match when drawing move is played", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        // Standard fast stalemate sequence setup
        match.moveHistory = [
          "e3",
          "a5",
          "Qh5",
          "Ra6",
          "Qxa5",
          "h5",
          "h4",
          "Rah6",
          "Qxc7",
          "f6",
          "Qxd7+",
          "Kf7",
          "Qxb7",
          "Qd3",
          "Qxb8",
          "Qh7",
          "Qxc8",
          "Kg6",
        ];
        match.sideToMove = "white";

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.makeMove("match-1", "player-1", "Qe6");

        expect(result.completed).toBe(true);
        expect(match.status).toBe("stalemate");
        expect(match.winner).toBeNull();
        expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
      });

      it("should block any further moves once the status is no longer ongoing", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        match.status = "checkmate";
        match.winner = "black";

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.makeMove("match-1", "player-1", "e4");
        expect(result.completed).toBe(false);
      });
    });
  });

  describe("resign", () => {
    it("should return completed false if the match does not exist", async () => {
      const { service } = makeService();
      const result = await service.resign("non-existent-id", "player-1");
      expect(result.completed).toBe(false);
    });

    it("should successfully allow playerOne to resign and cleanly end the match", async () => {
      const { mockRedisRepo, service } = makeService();
      const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

      const { ActiveMatch } =
        await import("../domain/active-match/active-match.entity.js");
      const match = new ActiveMatch(hydratedEvent);

      jest.spyOn(mockRedisRepo, "findActiveMatchById").mockResolvedValue(match);

      const result = await service.resign("match-1", "player-1");

      expect(result.completed).toBe(true);
      expect(match.status).toBe("resign");
      expect(match.winner).toBe("black");
      expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
    });

    it("should successfully allow playerTwo to resign and cleanly end the match", async () => {
      const { mockRedisRepo, service } = makeService();
      const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

      const { ActiveMatch } =
        await import("../domain/active-match/active-match.entity.js");
      const match = new ActiveMatch(hydratedEvent);

      jest.spyOn(mockRedisRepo, "findActiveMatchById").mockResolvedValue(match);

      const result = await service.resign("match-1", "player-2");

      expect(result.completed).toBe(true);
      expect(match.status).toBe("resign");
      expect(match.winner).toBe("white");
      expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
    });

    it("should reject resignation from an external playerId who is not in the match", async () => {
      const { mockRedisRepo, service } = makeService();
      const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

      const { ActiveMatch } =
        await import("../domain/active-match/active-match.entity.js");
      const match = new ActiveMatch(hydratedEvent);

      jest.spyOn(mockRedisRepo, "findActiveMatchById").mockResolvedValue(match);

      const result = await service.resign("match-1", "malicious-intruder");

      expect(result.completed).toBe(false);
      expect(match.status).toBe("ongoing");
      expect(mockRedisRepo.deleteActiveMatch).not.toHaveBeenCalled();
    });
  });

  describe("Clock and timeouts", () => {
    describe("makeMove with dynamic clock deduction", () => {
      it("should deduct time cleanly from white pool upon a successful move", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        match.whiteTimeLeftMs = 60000;
        // Set clock anchor back 10 seconds ago
        match.lastMoveAt = new Date(Date.now() - 10000);

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.makeMove("match-1", "player-1", "e4");

        expect(result.completed).toBe(true);
        expect(match.whiteTimeLeftMs).toBeLessThanOrEqual(50000);
        expect(match.status).toBe("ongoing");
      });

      it("should trigger immediate timeout termination if white player takes too long on turn submission", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        match.whiteTimeLeftMs = 5000; // 5 seconds left
        match.lastMoveAt = new Date(Date.now() - 6000); // 6 seconds elapsed

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.makeMove("match-1", "player-1", "e4");

        expect(result.completed).toBe(false);
        expect(match.status).toBe("timeout");
        expect(match.winner).toBe("black");
        expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
      });
    });

    describe("checkTimeout (Passive Path Worker)", () => {
      it("should cleanly transition state and terminate game if checked after a timeout occurred", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        match.whiteTimeLeftMs = 10000;
        match.lastMoveAt = new Date(Date.now() - 15000); // Exceeded 10s pool

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.checkTimeout("match-1");

        expect(result.completed).toBe(true);
        expect(match.status).toBe("timeout");
        expect(match.winner).toBe("black");
        expect(mockRedisRepo.deleteActiveMatch).toHaveBeenCalledWith("match-1");
      });

      it("should deduct time but leave game active if checkTimeout runs before a player runs out of time", async () => {
        const { mockRedisRepo, service } = makeService();
        const hydratedEvent = new MatchFound("match-1", "player-1", "player-2");

        const { ActiveMatch } =
          await import("../domain/active-match/active-match.entity.js");
        const match = new ActiveMatch(hydratedEvent);
        match.whiteTimeLeftMs = 60000;
        match.lastMoveAt = new Date(Date.now() - 5000); // only 5s elapsed

        jest
          .spyOn(mockRedisRepo, "findActiveMatchById")
          .mockResolvedValue(match);

        const result = await service.checkTimeout("match-1");

        expect(result.completed).toBe(false);
        expect(match.status).toBe("ongoing");
        expect(mockRedisRepo.updateActiveMatchState).toHaveBeenCalled();
      });
    });
  });
});
