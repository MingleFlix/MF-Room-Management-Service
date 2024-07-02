import express from 'express';
import WebSocket from "ws";
import dotenv from 'dotenv';
import {authenticateJWT, JWTPayload} from "./lib/authHelper";
import routes from "./routes/routes";
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swaggerOptions';
import cookieParser from "cookie-parser";
import {Room, UserEvent} from "./types/room";
import withRetries from "./lib/retryHelper";

dotenv.config();
const { redisClient, roomClients, subscriberClient, subscribeToRoom } = require("./redis");

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

let room: Room;
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

    // ERROR handling
    if (!newUser ) {
        const msg = {
            type: 'UNAUTHORIZED',
            message: 'Invalid token provided'
        }
        ws.send(JSON.stringify(msg));
        ws.close();
        return;
    }

    if (!roomID) {
        const msg = {
            type: 'ERROR',
            message: 'Invalid roomID provided'
        }
        ws.send(JSON.stringify(msg));
        ws.close();
        return;
    }
    //check if roomID is valid and in db todo: use transaction to prevent data loss!
    try {
        await withRetries(async () => {
            await redisClient.watch(`rooms:${roomID}`);
            const roomData = await redisClient.hGet('rooms', roomID);
            if (!roomData) {
                const msg = {
                    type: 'NOT_FOUND',
                    message: 'Room not found'
                }
                ws.send(JSON.stringify(msg));
                ws.close();
                return;
            }

            // Room exists
            console.log('User:', newUser);
            room = JSON.parse(roomData);
            console.log('Room:', room);

            // Add the user to the roomClients map
            roomClients[roomID] = roomClients[roomID] || new Set();
            roomClients[roomID].add(ws);

            // subscribe to the room channel
            await subscribeToRoom(roomID);

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
        });
    } catch (error) {
        console.error('Error handling connection:', error);
        ws.close();
    } finally {
        await redisClient.unwatch();
    }


    ws.on('message', async (message) => {
        const event = JSON.parse(message as any);
        const roomID = event.roomID;

        // Publish the event to Redis
        await redisClient.publish(roomID, JSON.stringify(event));
    });


    ws.on('close', async () => {
        try {
            await redisClient.watch(`rooms:${roomID}`);
            const roomData = await redisClient.hGet('rooms', roomID);
            if (!roomData) {
                console.error('Room not found in Redis');
                return;
            }
            room = JSON.parse(roomData);
            // Remove user from the room on disconnect
            room.users = room.users.filter(roomUser => roomUser.id !== newUser?.userId);

            // Update the room in Redis
            await redisClient.hSet('rooms', roomID, JSON.stringify(room));
            // Remove the user from the roomClients map
            roomClients[roomID].delete(ws);
            if (roomClients[roomID].size === 0) {
                delete roomClients[roomID];
            }

            // Notify all users about the user leaving
            const userLeftEvent: UserEvent = {
                type: 'USER_LEFT',
                user: newUser.username,
                roomID: roomID,
                users: room.users
            };

            await redisClient.publish(roomID, JSON.stringify(userLeftEvent));
        } catch (error) {
            console.error('Error handling connection:', error);
            ws.close();
        } finally {
            await redisClient.unwatch();
        }
    });


    // Send ping messages every 30 seconds (keep the connection alive)
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);

    ws.on('pong', () => {
        console.log('Pong received');
    });
});

subscriberClient.on('subscribe', (channel: any, _count: any) => {
    console.log(`Subscribed to channel: ${channel}`);
});

// Subscribe to all room channels
                        // (async () => {
                        //     const roomKeys = await redisClient.hKeys('rooms');
                        //     roomKeys.forEach((roomID: any) => {
                        //         console.log(`Try subscribing to channel: ${roomID}`);
                        //         subscribeToRoom(roomID)
                        //     });
                        // })();