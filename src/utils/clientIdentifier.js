/**
 * Client identifier utilities
 * This module provides functionality to create and manage persistent
 * client identifiers for anonymous users
 */

/**
 * Generates or retrieves a persistent client identifier for anonymous users
 * @returns {string} A unique client identifier
 */
export const getClientIdentifier = () => {
  try {
    // Check if we already have a stored identifier
    let clientId = localStorage.getItem('anonymous_client_id');

    // If not, generate a new one
    if (!clientId) {
      // Create unique identifier combining timestamp and random string
      // Similar to the filename generation in the photo upload service
      clientId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Store it for future use
      localStorage.setItem('anonymous_client_id', clientId);
    }

    return clientId;
  } catch (error) {
    // In case localStorage is not available (private browsing, etc.)
    // Generate a one-time identifier that won't persist
    console.warn('Unable to access localStorage for client identifier:', error);
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};

/**
 * Clears the stored client identifier
 * Useful for implementing a "forget me" feature
 */
export const clearClientIdentifier = () => {
  try {
    localStorage.removeItem('anonymous_client_id');
  } catch (error) {
    console.warn('Unable to clear client identifier:', error);
  }
};