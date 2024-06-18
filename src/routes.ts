import express, {Router} from "express";
import authMiddleware, {AuthRequest} from "./middlewares/authMiddleware";
import {randomUUID} from "node:crypto";
import {redisClient} from "./redis";

const router: Router = express.Router();

router.use(authMiddleware);

router.post('/', async (req, res) => {
    const { name } = req.body;
    const userID = (req as AuthRequest).user?.userId;
    const roomId = randomUUID()
    const newRoom = { id: roomId, name };

    await redisClient.hSet('rooms', roomId, JSON.stringify(newRoom));
    res.status(201).json(newRoom);
});

router.get('/', async (req, res) => {
    const rooms = await redisClient.hGetAll('rooms');
    const roomList = Object.values(rooms).map(room => JSON.parse(room));
    res.json(roomList);
});

router.get('/:id', async (req, res) => {
    const room = await redisClient.hGet('rooms', req.params.id);
    if (room) {
        res.json(JSON.parse(room));
    } else {
        res.status(404).send('Room not found');
    }
});

router.delete('/:id', async (req, res) => {
    await redisClient.hDel('rooms', req.params.id);
    res.status(204).send();
});

export default router;