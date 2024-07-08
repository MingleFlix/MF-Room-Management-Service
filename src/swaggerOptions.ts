/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */
// Determine the environment
import path from "node:path";

const dev = process.env.NODE_ENV !== 'production';
const apiDocsPath = dev ? './src/routes/*.ts' : './dist/routes/*.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Room Management Service API',
            version: '1.0.0',
            description: 'APIs for managing rooms',
        },
        components: {
            schemas: {
                Room: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Unique identifier for the room',
                        },
                        name: {
                            type: 'string',
                            description: 'Name of the room',
                        },
                        users: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'List of users in the room',
                        },
                    },
                    required: ['id', 'name', 'users'],
                },
            },
        },
    },
    apis: [path.resolve(apiDocsPath)], // Path to the API docs
};

export default options;