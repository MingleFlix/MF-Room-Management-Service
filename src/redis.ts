import {createClient} from "redis";
import WebSocket from "ws";


const redisHost = process.env.REDIS_HOST || 'localhost';

console.log(`Connecting to Redis at ${redisHost}`);

// Set up Redis client
export const client = createClient({ url: `redis://${redisHost}:6379` });
client.connect().catch(console.error);

export const subscriberClient = createClient({url: `redis://${redisHost}:6379`});
subscriberClient.connect().catch(console.error);

// Mapping of roomID to connected WebSocket clients
export const roomClients: { [roomID: string]: Set<WebSocket> } = {};

export const subscribeToRoom = async (roomID: string) => {
    console.log(`Subscribing to room ${roomID}`);
    await subscriberClient.subscribe(roomID, (msg, channel) => {
        console.log(`Received message from channel ${channel}: ${msg}`);
        if (roomClients[channel]) {
            roomClients[channel].forEach((ws: WebSocket) => {
                ws.send(msg);
            });
        }
    });
}