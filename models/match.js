import db from '../configs/db.js'

export class Match {
    constructor(matchId, whiteId, blackId) {
        this.id = matchId
        this.playerWhiteId = whiteId
        this.playerBlackId = blackId
        this.turn = 'white'
        this.moves = []

        db.prepare(`
        INSERT INTO matches (id, player_white, player_black)
        VALUES (?, ?, ?)`
        ).run(this.matchId, this.playerWhiteId, this.playerBlackId)
    }

    updateMatchState(newMove) {
        this.turn = this.turn === 'white' ? 'black' : 'white'
        this.moves.push(newMove)
    }
}