/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
import express, {Router} from "express";
import authMiddleware from "../middlewares/authMiddleware";
import {createRoomData} from "../types/room";
import {createRoom, deleteRoomById, getAllRooms, getRoomById} from "../handler/room";

const router: Router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: The room was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 */
router.post('/', async (req, res) => {
    const {name} = req.body as createRoomData;
    const userId = req.user!.userId;
    const newRoom = await createRoom(name, userId);
    res.status(201).json(newRoom);
});

/**
 * @openapi
 * /rooms:
 *   get:
 *     summary: Get all rooms
 *     responses:
 *       200:
 *         description: A list of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get('/', async (req, res) => {
    const roomList = await getAllRooms();
    res.json(roomList);
});

/**
 * @openapi
 * /rooms/{id}:
 *   get:
 *     summary: Get a specific room by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The requested room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 */
router.get('/:id', async (req, res) => {
    const {id} = req.params;
    const room = await getRoomById(id);
    if (room) {
        res.json(JSON.parse(room));
    } else {
        res.status(404).send('Room not found');
    }
});

/**
 * @openapi
 * /rooms/{id}:
 *   delete:
 *     summary: Delete a specific room by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Room successfully deleted
 *       404:
 *         description: Room not found
 */
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    const success = await deleteRoomById(id);
    if (!success) {
        res.status(404).send('Room not found');
        return;
    }
    res.status(204).send();
});

export default router;