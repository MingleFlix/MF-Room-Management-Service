import {randomUUID} from "node:crypto";
import {Room} from "../types/room";
import {client, subscribeToRoom} from "../redis";

export async function createRoom(name: string, userId: string) {
    const roomId = randomUUID()
    const newRoom: Room = {
        id: roomId,
        name,
        users: [],
        owner: userId
    };

    await client.hSet('rooms', roomId, JSON.stringify(newRoom));
    await subscribeToRoom(roomId);
    return newRoom;
}

export async function getAllRooms() {
    const rooms = await client.hGetAll('rooms');
    const roomList: Room[] = Object.values(rooms).map(room => JSON.parse(room));
    return roomList;
}

export async function getRoomById(id: string) {
    const room = await client.hGet('rooms', id);
    return room;
}

export async function deleteRoomById(id: string) {
    const success = await client.hDel('rooms', id);
    return success;
}