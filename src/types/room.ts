/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */

export interface createRoomData {
    name: string;
}

export interface Room {
    id: string;
    name: string;
    users: User[];
    owner: string;
}

export interface User {
    id: string;
    name: string;
}

export interface UserEvent {
    type: 'USER_JOINED' | 'USER_LEFT';
    roomID: string;
    user: string;
    users: User[];
}