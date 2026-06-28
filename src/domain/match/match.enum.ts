import z from "zod";

export enum SIDE {
  WHITE = "WHITE",
  BLACK = "BLACK",
  NONE = "NONE",
}

export const SideSchema = z.enum(SIDE);

export enum MATCH_STATUS {
  ONGOING = "ONGOING",
  ENDED = "ENDED",
}

export enum MATCH_RESULT {
  CHECKMATE = "CHECKMATE",
  RESIGNATION = "RESIGNATION",
  TIMEOUT = "TIMEOUT",
  DRAW = "DRAW",
}

export const MatchResultSchema = z.enum(MATCH_RESULT);
