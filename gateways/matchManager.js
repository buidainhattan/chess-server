import { randomUUID } from 'crypto'
import db from '../configs/db.js'
import { Match } from '../models/match.js'

const waitingPlayer = { socketId: null }
const activeMatches = new Map()
const privateRooms = new Map()

export function handleConnection(socket, io) {

    socket.on('join_match_making', () => {
        if (waitingPlayer.socketId === null) {
            waitingPlayer.socketId = socket.id
            socket.emit('waiting', { message: 'waiting for opponent...' })
        } else {
            const matchId = randomUUID()
            const match = Match(matchId, waitingPlayer.socketId, socket.id)

            activeMatches.set(matchId, match)

            io.sockets.sockets.get(waitingPlayer)?.join(matchId)
            socket.join(matchId)

            io.to(matchId).emit('match_start', match)

            waitingPlayer.socketId = null
        }
    })

    socket.on('create_room', () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()

        privateRooms.set(code, { hostId: socket.id })
        socket.emit('room_created', { code })
    })

    socket.on('join_room', ({ code }) => {
        const room = privateRooms.get(code)

        if (!room) {
            socket.emit('error', { message: 'room not found' })
            return
        }

        if (room.hostId === socket.id) {
            socket.emit('error', { message: 'cannot join your own room' })
            return
        }

        privateRooms.delete(code)

        const matchId = randomUUID()
        const match = Match(matchId, room.hostId, socket.id)

        activeMatches.set(matchId, match)

        socket.join(matchId)
        io.sockets.sockets.get(room.hostId)?.join(matchId)

        io.to(matchId).emit('match_start', match)
    })

    socket.on('move', ({ matchId, move }) => {
        const match = activeMatches.get(matchId)

        if (!match) {
            socket.emit('error', { message: 'match not found' })
            return
        }

        const playerColor = match.white === socket.id ? 'white' : 'black'

        if (playerColor !== match.turn) {
            socket.emit('error', { message: 'not your turn' })
            return
        }

        match.updateMatchState(move)

        socket.to(matchId).emit('opponent_move', { move })
    })

    // #TODO: Optimize
    socket.on('resign', ({ matchId }) => {
        endMatch(matchId, socket.id === activeMatches.get(matchId)?.white ? 'black' : 'white', io)
    })

    socket.on('disconnect', () => {
        for (const [matchId, match] of activeMatches) {
            if (match.white === socket.id || match.black === socket.id) {
                const winner = match.white === socket.id ? 'black' : 'white'
                endMatch(matchId, winner, io)
                break
            }
        }

        if (waitingPlayer.socketId === socket.id) {
            waitingPlayer.socketId = null
        }

        for (const [code, room] of privateRooms) {
            if (room.hostId === socket.id) {
                privateRooms.delete(code)
                break
            }
        }
    })
}

function endMatch(matchId, result, io) {
    const match = activeMatches.get(matchId)
    if (!match) return

    db.prepare(`
    UPDATE matches
    SET result = ?, moves = ?, ended_at = unixepoch()
    WHERE id = ?
  `).run(result, JSON.stringify(match.moves), matchId)

    io.to(matchId).emit('match_end', { result })
    activeMatches.delete(matchId)
}