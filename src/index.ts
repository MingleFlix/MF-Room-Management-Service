import express from 'express';
import WebSocket from "ws";
import dotenv from 'dotenv';
import {authenticateJWT, JWTPayload} from "./lib/authHelper";
import {redisClient, subscriberClient} from "./redis";
import routes from "./routes/routes";
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swaggerOptions';
import cookieParser from "cookie-parser";
import {Room, UserEvent} from "./types/room";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Swagger setup
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Use cookie-parser middleware
app.use(cookieParser());

// Express server
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Room Management Service');
});

app.use('/rooms', routes);

const server = app.listen(port, () => {
    console.log(`Room Management Service is running on port ${port}`);
});


// Websocket server
const wss = new WebSocket.Server({ server: server});

// Mapping of roomID to connected WebSocket clients
const roomClients: { [roomID: string]: Set<WebSocket> } = {};

wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');
    // Authenticate user via JWT (simplified example)
    // Parse room ID from query parameters
    const params = new URLSearchParams(req.url?.substring(1));
    const roomID = params.get('roomID');
    const token = params.get('token');
    console.log('roomID:', roomID);
    console.log('token:', token);
    let newUser: JWTPayload | undefined;
    try {
        newUser = authenticateJWT(token || '');
    } catch (error) {
        console.error('Error authenticating user:', error);
    }

    if (!newUser || !roomID) {
        ws.send('Invalid roomID or token')
        ws.close();
        return;
    }
    //check if roomID is valid and in db todo: use transaction to prevent data loss!
    const roomData = await redisClient.hGet('rooms', roomID);
    if (!roomData) {
        ws.send('Invalid roomID');
        ws.close();
        return;
    }

    console.log('User:', newUser);
    let room: Room = JSON.parse(roomData);
    console.log('Room:', room);

    // Add user to the room if not already present
    if (!room.users.find(u => u.id === newUser?.userId)) {
        room.users.push({
            name: newUser.username,
            id: newUser.userId
        });

        // Update the room in Redis
        await redisClient.hSet('rooms', roomID, JSON.stringify(room));

        // Notify all users about the new user
        const newUserEvent: UserEvent = {
            type: 'USER_JOINED',
            roomID: roomID,
            user: newUser.username,
            users: room.users
        };

        // Publish the new user event to all users in the room
        await redisClient.publish(roomID, JSON.stringify(newUserEvent));
    }

    // Send the current state of the room to the newly joined user
    ws.send(JSON.stringify({
        type: 'ROOM_STATE',
        room: room
    }));


    ws.on('message', async (message) => {
        const event = JSON.parse(message as any);
        const roomID = event.roomID;

        // Publish the event to Redis
        await redisClient.publish(roomID, JSON.stringify(event));
    });


    ws.on('close', async () => {
        // Remove user from the room on disconnect
        room.users = room.users.filter(roomUser => roomUser.name !== newUser?.username);

        // Update the room in Redis
        await redisClient.hSet('rooms', roomID, JSON.stringify(room));

        // Notify all users about the user leaving
        const userLeftEvent: UserEvent = {
            type: 'USER_LEFT',
            user: newUser.username,
            roomID: roomID,
            users: room.users
        };

        await redisClient.publish(roomID, JSON.stringify(userLeftEvent));
    });
});

// Subscribe to Redis channels for room updates
subscriberClient.on('message', (channel, message) => {
    const event = JSON.parse(message);

    // Relay the message to all WebSocket clients in the room
    const roomID = event.roomID;
    const clients = roomClients[roomID];
    if (clients) {
        clients.forEach((ws: WebSocket) => {
            ws.send(message);
        });
    }
});

subscriberClient.on('subscribe', (channel, _count) => {
    console.log(`Subscribed to channel: ${channel}`);
});

// Subscribe to all room channels
(async () => {
    const roomKeys = await redisClient.hKeys('rooms');
    roomKeys.forEach(roomID => {
        console.log(`Try subscribing to channel: ${roomID}`);
        subscriberClient.subscribe(roomID, (channel, message) => {
            console.log(`Received message from channel ${channel}: ${message}`);
            if (roomClients[channel]) {
                roomClients[channel].forEach((ws: WebSocket) => {
                    ws.send(message);
                });
            }
        });
    });
})();