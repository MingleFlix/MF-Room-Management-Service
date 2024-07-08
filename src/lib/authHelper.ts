/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
import jwt from "jsonwebtoken";

// Interface representing the structure of the JWT payload
export interface JWTPayload {
    userId: string;
    email: string;
    username: string;
}

/**
 * Function to authenticate a JWT token and return the decoded payload.
 *
 * @param {string} token - The JWT token to be authenticated.
 * @returns {JWTPayload} - The decoded payload containing user information.
 * @throws {Error} - If the secret key is not set or token verification fails.
 */
export function authenticateJWT(token: string): JWTPayload {
    // Retrieve the secret key from environment variables
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
        throw new Error('No secret key'); // Throw an error if the secret key is not set
    }

    // Verify the token and decode the payload
    const decoded = jwt.verify(token, secretKey);

    // Cast and return the decoded payload as JWTPayload
    return decoded as JWTPayload;
}
