/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */

import { NextFunction, Request, Response } from 'express';
import { authenticateJWT, JWTPayload } from "../lib/authHelper";

// Extending the Express Request interface to include user property of type JWTPayload
declare global {
    namespace Express {
        interface Request {
            user: JWTPayload;
        }
    }
}

// Middleware function to authenticate JWT and add user information to the request
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Retrieve the token from cookies
    const token = req.cookies['auth_token'];

    // If no token is provided, deny access
    if (!token) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }

    try {
        // Authenticate the JWT token
        req.user = authenticateJWT(token);

        // If the token is invalid, throw an error
        if (!req.user) {
            throw new Error('Invalid token');
        }

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // If authentication fails, respond with a 401 status and error message
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export default authMiddleware;
