export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export interface ApiError {
  code: string;
  message: string;
}
