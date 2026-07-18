import { MatchRequest } from "./match-request.entity.js";

export interface IMatchmakingRepo {
  saveMatchRequest(matchRequest: MatchRequest): Promise<void>;
  deleteMatchRequest(playerId: string): Promise<void>;
  findMatchRequestByPlayerId(playerId: string): Promise<MatchRequest | null>;
  findWaitingMatchRequests(): Promise<MatchRequest[]>;
}
