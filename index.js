import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { handleConnection } from './gateways/matchManager.js'
import statRouter from './routes/stats.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

app.use(express.json())
app.use('/stat', statRouter)

app.get('/', (req, res) => {
    res.json({ status: 'chess server is running' })
})

io.on('connection', (socket) => {
    console.log(`socket connected: ${socket.id}`)
    handleConnection(socket, io)

    socket.on('disconnect', () => {
        console.log(`socket disconnected: ${socket.id}`)
    })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`)
})