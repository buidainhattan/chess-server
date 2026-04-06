import z from "zod";

export enum SIDE {
  WHITE = "WHITE",
  BLACK = "BLACK",
}

export const SideSchema = z.enum(SIDE);

export enum MATCH_MAKING_STATUS {
  SEARCHING = "SEARCHING",
  MATCH_FOUND = "MATCH_FOUND",
  CANCELLED = "CANCELLED",
  ERROR = "ERROR",
}

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
