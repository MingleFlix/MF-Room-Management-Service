const MAX_RETRIES = 5;
const RETRY_DELAY = 100; // milliseconds

export default async function withRetries(fn: () => Promise<any>){
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= MAX_RETRIES) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}