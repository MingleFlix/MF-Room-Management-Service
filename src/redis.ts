import {createClient} from "redis";


const redisHost = process.env.REDIS_HOST || 'localhost';

// Set up Redis client
export const redisClient = createClient({ url: `redis://${redisHost}:6379` });
redisClient.connect().catch(console.error);

export const subscriberClient = createClient({url: `redis://${redisHost}:6379`});
subscriberClient.connect().catch(console.error);