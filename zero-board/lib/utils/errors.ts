import { AxiosError } from "axios";

/**
 * Extracts a user-friendly error message from an API error response.
 * Ensures sensitive information is not exposed to the client.
 */
export function getErrorMessage(error: unknown): string {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response;
    
    if (response?.data) {
      // FastAPI typically returns { detail: "message" }
      if (typeof response.data === "object" && "detail" in response.data) {
        return String(response.data.detail);
      }
      
      // Handle string responses
      if (typeof response.data === "string") {
        return response.data;
      }
      
      // Handle error objects with message
      if (typeof response.data === "object" && "message" in response.data) {
        return String(response.data.message);
      }
    }
    
    // Handle specific HTTP status codes
    if (response?.status === 401) {
      return "Authentication required. Please log in.";
    }
    
    if (response?.status === 403) {
      return "You don't have permission to perform this action.";
    }
    
    if (response?.status === 404) {
      return "The requested resource was not found.";
    }
    
    if (response?.status === 429) {
      return "Too many requests. Please try again later.";
    }
    
    if (response?.status === 500) {
      return "A server error occurred. Please try again later.";
    }
    
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    
    if (error.message) {
      return error.message;
    }
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback for unknown errors
  return "An unexpected error occurred. Please try again.";
}

