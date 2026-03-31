import { Router } from 'express'
import db from '../configs/db.js'

const router = Router()

router.get('/matches/:playerId', (req, res) => {
    const { playerId } = req.params

    const matches = db.prepare(`
    SELECT * FROM matches
    WHERE player_white = ? OR player_black = ?
    ORDER BY created_at DESC
  `).all(playerId, playerId)

    res.json(matches)
})

router.get('/matches/:playerId/summary', (req, res) => {
    const { playerId } = req.params

    const summary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (result = 'white' AND player_white = ?) OR (result = 'black' AND player_black = ?) THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN (result = 'white' AND player_black = ?) OR (result = 'black' AND player_white = ?) THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
    FROM matches
    WHERE player_white = ? OR player_black = ?
    AND result IS NOT NULL
  `).get(playerId, playerId, playerId, playerId, playerId, playerId)

    res.json(summary)
})

export default router