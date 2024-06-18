import express from 'express';
import {randomUUID} from "node:crypto";
import WebSocket from "ws";
import {authenticateJWT} from "./lib/authHelper";
import {redisClient} from "./redis";
import {AuthRequest} from "./middlewares/authMiddleware";
import routes from "./routes";

const app = express();
const port = 3000;

// Websocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', async (ws, req) => {
    // Authenticate user via JWT (simplified example)
    // Parse room ID from query parameters
    const params = new URLSearchParams(req.url?.substring(1));
    const roomID = params.get('roomID');
    const token = params.get('token');
    let user: any;
    try {
        user = authenticateJWT(token || '');
    } catch (error) {
        console.error('Error authenticating user:', error);
    }


    if (!user || !roomID) {
        ws.close();
        return;
    }
    //check if roomID is valid and in db
    const room =  await redisClient.hGet('rooms', roomID);
    if (!room) {
        ws.close();
        return;
    }

    ws.on('message', async (message) => {
        const event = JSON.parse(message as any);
        const roomID = event.roomID;

        // Publish the event to Redis
        await redisClient.publish(roomID, JSON.stringify(event));
    });
});

// Express server
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Room Management Service');
});

app.use('/rooms', routes);

app.listen(port, () => {
    console.log(`Room Management Service is running on http://localhost:${port}`);
});