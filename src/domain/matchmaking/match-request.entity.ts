export class MatchRequest {
  constructor(
    readonly id: string,
    readonly playerId: string,
    readonly createdAt: Date = new Date(),
  ) {}

  isOwnedBy(playerId: string): boolean {
    return this.playerId === playerId;
  }
}
