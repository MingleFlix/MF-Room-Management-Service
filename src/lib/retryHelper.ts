/*
 * Author: Jesse Günzl
 * Matrikelnummer: 2577166
 */

// Constants for maximum retries and delay between retries
const MAX_RETRIES = 5;
const RETRY_DELAY = 100; // milliseconds

/**
 * Function to execute a given asynchronous function with retries on failure.
 *
 * @param {Function} fn - The asynchronous function to be executed.
 * @returns {Promise<any>} - The result of the asynchronous function if successful.
 * @throws {Error} - If the function fails after the maximum number of retries.
 */
export default async function withRetries(fn: () => Promise<any>) {
    let attempt = 0; // Initialize the attempt counter
    while (attempt < MAX_RETRIES) { // Loop until the maximum number of retries
        try {
            // Attempt to execute the function
            return await fn();
        } catch (error) {
            attempt++; // Increment the attempt counter
            if (attempt >= MAX_RETRIES) { // If maximum retries reached, throw the error
                throw error;
            }
            // Wait for the specified delay before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}
