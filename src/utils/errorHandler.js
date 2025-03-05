/**
 * Centralized error handling utility
 * @param {Error} error - The original error object
 * @param {string} context - Context where the error occurred
 * @returns {Object} Object with original error and user-friendly message
 */
export const handleApiError = (error, context = '') => {
  // Log the error
  console.error(`API Error (${context}):`, error);

  // Determine user-friendly message
  let userMessage = 'An unexpected error occurred';

  if (error.message) {
    if (error.message.includes('storage/unauthorized')) {
      userMessage = 'You do not have permission to upload photos';
    } else if (error.message.includes('storage/quota-exceeded')) {
      userMessage = 'Storage quota exceeded. Please try a smaller image';
    } else if (error.message.includes('network')) {
      userMessage = 'Network error. Please check your connection';
    } else if (error.message.includes('File size exceeds')) {
      userMessage = error.message; // Already user-friendly
    } else if (error.message.includes('not supported')) {
      userMessage = error.message; // Already user-friendly for file type errors
    } else {
      userMessage = `Error: ${error.message}`;
    }
  }

  return {
    originalError: error,
    userMessage
  };
};