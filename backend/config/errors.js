/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'APIError';
  }
}

module.exports = APIError;
