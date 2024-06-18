const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Room Management Service API',
            version: '1.0.0',
            description: 'APIs for managing rooms',
        },
        servers: [
            {
                url: 'http://localhost:3000',
            },
        ],
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
    apis: ['./routes.ts'],
};

export default options;