/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
import { createClient } from "redis";
import WebSocket from "ws";

// Get the Redis host from environment variables or default to 'localhost'
const redisHost = process.env.REDIS_HOST || 'localhost';

// Log the Redis connection attempt
console.log(`Connecting to Redis at ${redisHost}`);

// Set up Redis client for general use
export const client = createClient({ url: `redis://${redisHost}:6379` });
// Connect to Redis and handle any connection errors
client.connect().catch(console.error);

// Set up Redis client for subscription use
export const subscriberClient = createClient({ url: `redis://${redisHost}:6379` });
// Connect to Redis and handle any connection errors
subscriberClient.connect().catch(console.error);

// Mapping of roomID to connected WebSocket clients
export const roomClients: { [roomID: string]: Set<WebSocket> } = {};

/**
 * Subscribe to a specific Redis channel (room) and forward messages to connected WebSocket clients.
 *
 * @param roomID - The ID of the room to subscribe to.
 */
export const subscribeToRoom = async (roomID: string) => {
    console.log(`Subscribing to room ${roomID}`);

    // Subscribe to the given roomID channel
    await subscriberClient.subscribe(roomID, (msg, channel) => {
        console.log(`Received message from channel ${channel}: ${msg}`);

        // Check if there are any WebSocket clients connected to this room
        if (roomClients[channel]) {
            // Send the received message to each connected WebSocket client
            roomClients[channel].forEach((ws: WebSocket) => {
                ws.send(msg);
            });
        }
    });
};
