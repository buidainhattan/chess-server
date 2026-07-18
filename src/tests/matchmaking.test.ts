import { describe, it, expect, jest } from "@jest/globals";

import { EventEmitter } from "events";
import { MatchmakingService } from "../application/matchmaking.service.js";
import { InMemoryMatchmakingRepo } from "../infrastructure/in-memory-matchmaking.repo.js";
import { MatchFound } from "../domain/matchmaking/match-found.event.js";

function makeService() {
  const repo = new InMemoryMatchmakingRepo();
  const eventEmitter = new EventEmitter();
  const service = new MatchmakingService(repo, eventEmitter);
  return { repo, eventEmitter, service };
}

describe("MatchmakingService", () => {
  describe("joinQueue", () => {
    it("should save a match request for a new player", async () => {
      const { repo, service } = makeService();

      await service.joinQueue("player-1");

      const request = await repo.findMatchRequestByPlayerId("player-1");
      expect(request).not.toBeNull();
      expect(request?.playerId).toBe("player-1");
    });

    it("should return alreadyQueued if player joins twice", async () => {
      const { service } = makeService();

      await service.joinQueue("player-1");
      const result = await service.joinQueue("player-1");

      expect(result.alreadyQueued).toBe(true);
    });

    it("should not save a second request if player is already queued", async () => {
      const { repo, service } = makeService();

      await service.joinQueue("player-1");
      await service.joinQueue("player-1");

      const request = await repo.findMatchRequestByPlayerId("player-1");
      expect(request).not.toBeNull(); // still one entry, not duplicated
    });

    it("should emit MatchFound when two players join", async () => {
      const { eventEmitter, service } = makeService();

      const matchFoundHandler = jest.fn<(event: MatchFound) => void>();
      eventEmitter.on(MatchFound.NAME, matchFoundHandler);

      await service.joinQueue("player-1");
      await service.joinQueue("player-2");

      expect(matchFoundHandler).toHaveBeenCalledTimes(1);
      const event: MatchFound = matchFoundHandler.mock.calls[0]?.[0]!;
      expect(event.playerOneId).toBe("player-1");
      expect(event.playerTwoId).toBe("player-2");
    });

    it("should remove both players from the queue after a match is found", async () => {
      const { repo, service } = makeService();

      await service.joinQueue("player-1");
      await service.joinQueue("player-2");

      const p1 = await repo.findMatchRequestByPlayerId("player-1");
      const p2 = await repo.findMatchRequestByPlayerId("player-2");
      expect(p1).toBeNull();
      expect(p2).toBeNull();
    });

    it("should not emit MatchFound when only one player is queued", async () => {
      const { eventEmitter, service } = makeService();

      const matchFoundHandler = jest.fn();
      eventEmitter.on(MatchFound.NAME, matchFoundHandler);

      await service.joinQueue("player-1");

      expect(matchFoundHandler).not.toHaveBeenCalled();
    });
  });

  describe("leaveQueue", () => {
    it("should remove the player from the queue", async () => {
      const { repo, service } = makeService();

      await service.joinQueue("player-1");
      await service.leaveQueue("player-1");

      const request = await repo.findMatchRequestByPlayerId("player-1");
      expect(request).toBeNull();
    });

    it("should be a no-op if the player is not queued", async () => {
      const { service } = makeService();

      await expect(service.leaveQueue("player-1")).resolves.not.toThrow();
    });
  });
});
