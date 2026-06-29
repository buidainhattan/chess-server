export class MatchFound {
  static readonly NAME = "matchmaking.match-found";

  constructor(
    readonly matchmakingId: string,
    readonly playerOneId: string,
    readonly playerTwoId: string,
    readonly foundAt: Date = new Date(),
  ) {}
}
