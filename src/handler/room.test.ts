import { randomUUID } from "node:crypto";
import { createRoom, getAllRooms, getRoomById, deleteRoomById } from "./room";
import { client, subscribeToRoom } from "../redis";
import { Room } from "../types/room";

// Mock the redis client and subscribeToRoom functions
jest.mock('../redis', () => ({
    client: {
        hSet: jest.fn(),
        hGetAll: jest.fn(),
        hGet: jest.fn(),
        hDel: jest.fn()
    },
    subscribeToRoom: jest.fn()
}));

describe('Room Service', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create a new room and subscribe to it', async () => {
            const name = "Test Room";
            const userId = "user123";
            const roomId = "12345-uuid";

            // Mock randomUUID to return a fixed value
            jest.spyOn(require('node:crypto'), 'randomUUID').mockReturnValue(roomId);

            const newRoom: Room = {
                id: roomId,
                name,
                users: [],
                owner: userId
            };

            (client.hSet as jest.Mock).mockResolvedValue(true);
            (subscribeToRoom as jest.Mock).mockResolvedValue(true);

            const result = await createRoom(name, userId);

            expect(client.hSet).toHaveBeenCalledWith('rooms', roomId, JSON.stringify(newRoom));
            expect(subscribeToRoom).toHaveBeenCalledWith(roomId);
            expect(result).toEqual(newRoom);
        });
    });

    describe('getAllRooms', () => {
        it('should retrieve all rooms', async () => {
            const rooms = {
                "room1": JSON.stringify({ id: "room1", name: "Room 1", users: [], owner: "owner1" }),
                "room2": JSON.stringify({ id: "room2", name: "Room 2", users: [], owner: "owner2" })
            };
            (client.hGetAll as jest.Mock).mockResolvedValue(rooms);

            const result = await getAllRooms();

            expect(client.hGetAll).toHaveBeenCalledWith('rooms');
            expect(result).toEqual([
                { id: "room1", name: "Room 1", users: [], owner: "owner1" },
                { id: "room2", name: "Room 2", users: [], owner: "owner2" }
            ]);
        });
    });

    describe('getRoomById', () => {
        it('should retrieve a room by id', async () => {
            const roomId = "room1";
            const room = JSON.stringify({ id: roomId, name: "Room 1", users: [], owner: "owner1" });
            (client.hGet as jest.Mock).mockResolvedValue(room);

            const result = await getRoomById(roomId);

            expect(client.hGet).toHaveBeenCalledWith('rooms', roomId);
            expect(result).toEqual(room);
        });
    });

    describe('deleteRoomById', () => {
        it('should delete a room by id', async () => {
            const roomId = "room1";
            (client.hDel as jest.Mock).mockResolvedValue(1);

            const result = await deleteRoomById(roomId);

            expect(client.hDel).toHaveBeenCalledWith('rooms', roomId);
            expect(result).toBe(1);
        });
    });
});