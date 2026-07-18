import type { ActiveMatch } from "./active-match.entity.js";

export interface IActiveMatchRepo {
  saveActiveMatch(activeMatch: ActiveMatch): Promise<void>;
  deleteActiveMatch(matchId: string): Promise<void>;
  findActiveMatchById(matchId: string): Promise<ActiveMatch | null>;
}
