import type { Side } from "../shared/side.type.js";
import type { ActiveMatch } from "./active-match.entity.js";

export interface IActiveMatchRepo {
  saveActiveMatch(activeMatch: ActiveMatch): Promise<void>;
  updateActiveMatchState(newActiveMatchState: ActiveMatch): Promise<void>;
  deleteActiveMatch(matchId: string): Promise<void>;
  findActiveMatchById(matchId: string): Promise<ActiveMatch | null>;
}
