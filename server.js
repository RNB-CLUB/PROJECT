import { createServer } from "http"
import chalk from "chalk"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Server } from "socket.io"

const server = createServer(async (req, res) => {
    try {
        logger(req)
        if (await getStaticFiles(req, res)) return
        switch (req.url) {
            default:
                res.statusCode = 404
                res.setHeader("content-type", "text/plain")
                res.end("Not Found")
        }
    } catch (error) {
        console.log(error)
        res.statusCode = 500
        res.end(error.message)
    }
})

const io = new Server(server)
io.on("connection", (socket) => {
    console.log(
        chalk.green("User Connected With Id: "),
        chalk.yellow(socket.id)
    )

    if (Object.keys(players).length < 2) {
        const takenSides = Object.values(players).map(p => p.side)
        const freeSide = takenSides.find(s => !takenSides)

        players[socket.id] = {
            y: 150,
            sides: freeSide
        }
    }

    socket.emit("init",{
        id: socket.id,
        players
    })

    socket.on("start", () => {
        isPlaying = true
        ball.x = 200
        ball.y = 300
        ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1)
        ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1)
    })
})

let ball = { x: 300, y: 200, vx: 4, vy: 3 }
let isPlaying = false
let players = {}
let sides = ["left", "right"]

setInterval(() => {
    if (!isPlaying) {
        io.emit("state", { ball, isPlaying })
        return
    }

    ball.x += ball.vx
    ball.y += ball.vy

    if (ball.x <= 0 || ball.x >= 600) ball.vx *= -1
    if (ball.y <= 0 || ball.y >= 400) ball.vy *= -1

    ball.vx += ball.vx * 0.005
    ball.vy += ball.vy * 0.005

    io.emit("state", { ball, isPlaying })
}, 1000 / 60)

server.listen(3000, () => console.log("Server On"))

function logger(req) {
    let url = chalk.green(req.url)
    let time = chalk.red(new Date().toLocateTimeString)
    let method = chalk.blue(req.method)
    console.log(`${time}: ${method} - ${url}`)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function getStaticFiles(req, res) {
    try {
        let nameFile = req.url.substring(1)
        if (req.url == "/") nameFile = "index.html"
        let pathToFile = path.join(__dirname, "static", nameFile)
        let file = await readFile(pathToFile)
        res.statusCode = 200
        res.end(file)
        return true
    } catch (err) {
        return false
    }
}