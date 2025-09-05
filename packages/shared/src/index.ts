// Shared types for frontend and backend

export interface NewUser {
  email: string;
  password?: string;
  name?: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Simple utility function for testing purposes
export function add(a: number, b: number): number {
  return a + b;
}
