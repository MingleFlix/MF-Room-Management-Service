import express from 'express';
import { createClient } from 'redis';

const app = express();
const port = 3000;
const redisHost = process.env.REDIS_HOST || 'localhost';

// Set up Redis client
const redisClient = createClient({ url: `redis://${redisHost}:6379` });
redisClient.connect().catch(console.error);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Room Management Service');
});

// Endpoint to create a room
app.post('/rooms', async (req, res) => {
    const { name } = req.body;
    const roomId = Date.now().toString(); // Simple unique ID
    const newRoom = { id: roomId, name };

    await redisClient.hSet('rooms', roomId, JSON.stringify(newRoom));
    res.status(201).json(newRoom);
});

// Endpoint to get all rooms
app.get('/rooms', async (req, res) => {
    const rooms = await redisClient.hGetAll('rooms');
    const roomList = Object.values(rooms).map(room => JSON.parse(room));
    res.json(roomList);
});

// Endpoint to get a single room by id
app.get('/rooms/:id', async (req, res) => {
    const room = await redisClient.hGet('rooms', req.params.id);
    if (room) {
        res.json(JSON.parse(room));
    } else {
        res.status(404).send('Room not found');
    }
});

// Endpoint to delete a room by id
app.delete('/rooms/:id', async (req, res) => {
    await redisClient.hDel('rooms', req.params.id);
    res.status(204).send();
});

app.listen(port, () => {
    console.log(`Room Management Service is running on http://localhost:${port}`);
});