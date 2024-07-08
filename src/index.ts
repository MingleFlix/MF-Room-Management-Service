/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
import express from 'express';
import WebSocket from "ws";
import dotenv from 'dotenv';
import { authenticateJWT, JWTPayload } from "./lib/authHelper";
import routes from "./routes/routes";
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swaggerOptions';
import cookieParser from "cookie-parser";
import { Room, UserEvent } from "./types/room";
import withRetries from "./lib/retryHelper";

dotenv.config();
const { client, roomClients, subscribeToRoom } = require("./redis");

const app = express();
const port = process.env.PORT || 3001;

// Swagger setup for API documentation
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Use cookie-parser middleware to parse cookies
app.use(cookieParser());

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route for the service
app.get('/', (req, res) => {
    res.send('Room Management Service');
});

// Routes for room management
app.use('/rooms', routes);

// Start the Express server
const server = app.listen(port, () => {
    console.log(`Room Management Service is running on port ${port}`);
});

// Set up WebSocket server on the same server as Express
const wss = new WebSocket.Server({ server: server });

let room: Room;
wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');

    // Parse room ID and token from query parameters
    const params = new URLSearchParams(req.url?.substring(1));
    const roomID = params.get('roomID');
    const token = params.get('token');
    console.log('roomID:', roomID);
    console.log('token:', token);

    // Authenticate user via JWT
    let newUser: JWTPayload | undefined;
    try {
        newUser = authenticateJWT(token || '');
    } catch (error) {
        console.error('Error authenticating user:', error);
    }

    // Handle authentication errors
    if (!newUser) {
        const msg = {
            type: 'UNAUTHORIZED',
            message: 'Invalid token provided'
        }
        ws.send(JSON.stringify(msg));
        ws.close();
        return;
    }

    // Handle missing roomID errors
    if (!roomID) {
        const msg = {
            type: 'ERROR',
            message: 'Invalid roomID provided'
        }
        ws.send(JSON.stringify(msg));
        ws.close();
        return;
    }

    try {
        await withRetries(async () => {
            await client.watch(`rooms:${roomID}`);
            const roomData = await client.hGet('rooms', roomID);

            // Check if roomID is valid and in the database
            if (!roomData) {
                const msg = {
                    type: 'NOT_FOUND',
                    message: 'Room not found'
                }
                ws.send(JSON.stringify(msg));
                ws.close();
                return;
            }

            // Room exists, add user to the room
            console.log('User:', newUser);
            room = JSON.parse(roomData);
            console.log('Room:', room);

            // Add the user to the roomClients map
            roomClients[roomID] = roomClients[roomID] || new Set();
            roomClients[roomID].add(ws);

            // Subscribe to the room channel
            await subscribeToRoom(roomID);

            // Add user to the room if not already present
            if (!room.users.find(u => u.id === newUser?.userId)) {
                room.users.push({
                    name: newUser.username,
                    id: newUser.userId
                });

                // Update the room in Redis
                await client.hSet('rooms', roomID, JSON.stringify(room));

                // Notify all users about the new user
                const newUserEvent: UserEvent = {
                    type: 'USER_JOINED',
                    roomID: roomID,
                    user: newUser.username,
                    users: room.users
                };

                // Publish the new user event to all users in the room
                await client.publish(roomID, JSON.stringify(newUserEvent));
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
        await client.unwatch();
    }

    // Handle incoming messages
    ws.on('message', async (message) => {
        const event = JSON.parse(message as any);
        const roomID = event.roomID;

        // Publish the event to Redis
        await client.publish(roomID, JSON.stringify(event));
    });

    // Handle WebSocket close event
    ws.on('close', async () => {
        try {
            await client.watch(`rooms:${roomID}`);
            const roomData = await client.hGet('rooms', roomID);
            if (!roomData) {
                console.error('Room not found in Redis');
                return;
            }
            room = JSON.parse(roomData);

            // Remove user from the room on disconnect
            room.users = room.users.filter(roomUser => roomUser.id !== newUser?.userId);

            // Update the room in Redis
            await client.hSet('rooms', roomID, JSON.stringify(room));

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

            await client.publish(roomID, JSON.stringify(userLeftEvent));
        } catch (error) {
            console.error('Error handling connection:', error);
            ws.close();
        } finally {
            await client.unwatch();
        }
    });

    // Send ping messages every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);

    // Handle pong responses to ping messages
    ws.on('pong', () => {
        console.log('Pong received');
    });
});
