/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
import { randomUUID } from "node:crypto";
import { Room } from "../types/room";
import { client, subscribeToRoom } from "../redis";

/**
 * Creates a new room with the specified name and owner userId.
 *
 * @param {string} name - The name of the new room.
 * @param {string} userId - The ID of the user creating the room.
 * @returns {Promise<Room>} - The newly created room object.
 */
export async function createRoom(name: string, userId: string): Promise<Room> {
    // Generate a unique room ID
    const roomId = randomUUID();

    // Create a new room object
    const newRoom: Room = {
        id: roomId,
        name,
        users: [],
        owner: userId
    };

    // Save the new room to the Redis database
    await client.hSet('rooms', roomId, JSON.stringify(newRoom));
    // Subscribe to the room channel
    await subscribeToRoom(roomId);

    return newRoom;
}

/**
 * Retrieves all rooms from the database.
 *
 * @returns {Promise<Room[]>} - A list of all rooms.
 */
export async function getAllRooms(): Promise<Room[]> {
    // Get all rooms from Redis
    const rooms = await client.hGetAll('rooms');

    // Parse and return the rooms as an array of Room objects
    const roomList: Room[] = Object.values(rooms).map(room => JSON.parse(room));
    return roomList;
}

/**
 * Retrieves a room by its ID.
 *
 * @param {string} id - The ID of the room to retrieve.
 * @returns {Promise<string | null>} - The room data as a string or null if not found.
 */
export async function getRoomById(id: string): Promise<string | undefined> {
    // Get the room from Redis by ID
    const room = await client.hGet('rooms', id);
    return room;
}

/**
 * Deletes a room by its ID.
 *
 * @param {string} id - The ID of the room to delete.
 * @returns {Promise<number>} - The number of deleted fields (0 if the room was not found).
 */
export async function deleteRoomById(id: string): Promise<number> {
    // Delete the room from Redis by ID
    const success = await client.hDel('rooms', id);
    return success;
}
