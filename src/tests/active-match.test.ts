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

        // player-2 (Black) tries to move first, but it is player-1's (White) turn
        const result = await service.makeMove("match-1", "player-2", "e5");

        expect(result.completed).toBe(false);
      });

      it("should reject a completely invalid chess move syntax or illegal rule execution", async () => {
        const { eventEmitter, service } = makeService();
        const event = new MatchFound("match-1", "player-1", "player-2");

        eventEmitter.emit(MatchFound.NAME, event);
        await new Promise(process.nextTick);

        // e5 is syntactically correct but physically illegal for White on turn 1
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
  });
});
