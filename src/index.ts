import express from 'express';
import {randomUUID} from "node:crypto";
import WebSocket from "ws";
import dotenv from 'dotenv';
import {authenticateJWT} from "./lib/authHelper";
import {redisClient} from "./redis";
import routes from "./routes";
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from './swaggerOptions';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Swagger setup
const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Express server
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Room Management Service');
});

app.use('/rooms', routes);

app.listen(port, () => {
    console.log(`Room Management Service is running on http://localhost:${port}`);
});