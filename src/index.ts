import express from 'express';
import WebSocket from "ws";
import dotenv from 'dotenv';
import {authenticateJWT} from "./lib/authHelper";
import {redisClient} from "./redis";
import routes from "./routes/routes";
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swaggerOptions';
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Swagger setup
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Use cookie-parser middleware
app.use(cookieParser());

// Express server
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Room Management Service');
});

app.use('/rooms', routes);

const server = app.listen(port, () => {
    console.log(`Room Management Service is running on http://localhost:${port}`);
});

// Websocket server
const wss = new WebSocket.Server({ server: server});

wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection');
    // Authenticate user via JWT (simplified example)
    // Parse room ID from query parameters
    const params = new URLSearchParams(req.url?.substring(1));
    const roomID = params.get('roomID');
    const token = params.get('token');
    console.log('roomID:', roomID);
    console.log('token:', token);
    let user: any;
    try {
        user = authenticateJWT(token || '');
    } catch (error) {
        console.error('Error authenticating user:', error);
    }


    if (!user || !roomID) {
        ws.close();
        return;
    }
    //check if roomID is valid and in db
    const room =  await redisClient.hGet('rooms', roomID);
    if (!room) {
        ws.close();
        return;
    }

    ws.on('message', async (message) => {
        const event = JSON.parse(message as any);
        const roomID = event.roomID;

        // Publish the event to Redis
        await redisClient.publish(roomID, JSON.stringify(event));
    });
});