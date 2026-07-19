import type { RedisClientType } from "redis";
import { ActiveMatch } from "../domain/active-match/active-match.entity.js";
import type { IActiveMatchRepo } from "../domain/active-match/iactive-match.repo.js";
import type { Side } from "../domain/shared/type/side.type.js";
import type { MatchStatus } from "../domain/shared/type/match-status.type.js";

export class RedisActiveMatchRepo implements IActiveMatchRepo {
  private readonly prefix = "active-match:";

  constructor(private readonly redisClient: RedisClientType) {}

  async saveActiveMatch(activeMatch: ActiveMatch): Promise<void> {
    const key = this.keyCrafter(activeMatch.id);
    await this.redisClient.hSet(key, {
      playerOneId: activeMatch.playerOneId,
      playerTwoId: activeMatch.playerTwoId,
      startAt: activeMatch.startAt.toISOString(),
      sideToMove: activeMatch.sideToMove,
      moveHistory: JSON.stringify(activeMatch.moveHistory),
      status: activeMatch.status,
      winner: activeMatch.winner ?? "", // Redis hSet values should be strings
    });
  }

  async updateActiveMatchState(
    newActiveMatchState: ActiveMatch,
  ): Promise<void> {
    const key = this.keyCrafter(newActiveMatchState.id);
    const newState = {
      sideToMove: newActiveMatchState.sideToMove,
      moveHistory: JSON.stringify(newActiveMatchState.moveHistory),
      status: newActiveMatchState.status,
      winner: newActiveMatchState.winner ?? "", // Redis hSet values should be strings
    };

    await this.redisClient.hSet(key, newState);
  }

  async findActiveMatchById(matchId: string): Promise<ActiveMatch | null> {
    const key = this.keyCrafter(matchId);
    const data = await this.redisClient.hGetAll(key);
    if (!data || Object.keys(data).length === 0) return null;

    // Reconstruct instance to preserve domain methods and status tracking
    const match = new ActiveMatch({
      id: matchId,
      playerOneId: data.playerOneId as string,
      playerTwoId: data.playerTwoId as string,
      foundAt: new Date(), // placeholder — required by MatchFound shape, unused post-hydration
    });
    match.sideToMove = data.sideToMove as Side;
    match.startAt = new Date(data.startAt as string);
    match.moveHistory = JSON.parse(data.moveHistory as string);
    match.status = data.status as MatchStatus;
    match.winner = (data.winner as Side) || null;

    return match;
  }

  async deleteActiveMatch(matchId: string): Promise<void> {
    await this.redisClient.del(this.keyCrafter(matchId));
  }

  private keyCrafter(matchId: string): string {
    return `${this.prefix}${matchId}`;
  }
}
