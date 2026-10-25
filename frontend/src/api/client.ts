import { User, AuthResponse, RegisterResponse, ApiError } from "../types/auth.js";
import { Vehicle, VehicleFilters, CreateVehicleInput, UpdateVehicleInput } from "../types/vehicle.js";
import { rupeesToPaise } from "../utils/currency.js";

let inMemoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export function setOnUnauthorizedCallback(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

export class ApiRequestError extends Error {
  public code: string;
  public status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code || "UNKNOWN_ERROR";
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (inMemoryToken) {
    headers.set("Authorization", `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.status === 401 && endpoint !== "/api/auth/login") {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  if (res.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { error: { code: "INVALID_RESPONSE", message: "Server returned a non-JSON response." } };
  }

  if (!res.ok) {
    const errorObj: ApiError = data.error || {
      code: "HTTP_" + res.status,
      message: res.statusText || "Request failed."
    };
    throw new ApiRequestError(res.status, errorObj);
  }

  return data;
}

export const api = {
  // Auth
  async register(email: string, password: string): Promise<User> {
    const data = await request<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return data.user;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    return data;
  },

  async getMe(): Promise<User> {
    const data = await request<{ user: User }>("/api/auth/me", {
      method: "GET"
    });
    return data.user;
  },

  // Vehicles
  async listVehicles(): Promise<Vehicle[]> {
    const data = await request<{ vehicles: Vehicle[] }>("/api/vehicles", {
      method: "GET"
    });
    return data.vehicles;
  },

  async searchVehicles(filters: VehicleFilters): Promise<Vehicle[]> {
    const params = new URLSearchParams();

    if (filters.make && filters.make.trim()) {
      params.set("make", filters.make.trim());
    }
    if (filters.model && filters.model.trim()) {
      params.set("model", filters.model.trim());
    }
    if (filters.category && filters.category.trim()) {
      params.set("category", filters.category.trim());
    }
    if (filters.minRupees && filters.minRupees.trim()) {
      const paise = rupeesToPaise(filters.minRupees.trim());
      params.set("minPrice", String(paise));
    }
    if (filters.maxRupees && filters.maxRupees.trim()) {
      const paise = rupeesToPaise(filters.maxRupees.trim());
      params.set("maxPrice", String(paise));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/vehicles/search?${queryString}` : "/api/vehicles";
    const data = await request<{ vehicles: Vehicle[] }>(endpoint, {
      method: "GET"
    });
    return data.vehicles;
  },

  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    const data = await request<{ vehicle: Vehicle }>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify({
        make: input.make,
        model: input.model,
        category: input.category,
        price: input.pricePaise,
        quantity: input.quantity
      })
    });
    return data.vehicle;
  },

  async updateVehicle(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    const data = await request<{ vehicle: Vehicle }>(`/api/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        make: input.make,
        model: input.model,
        category: input.category,
        price: input.pricePaise
      })
    });
    return data.vehicle;
  },

  async deleteVehicle(id: string): Promise<void> {
    await request<void>(`/api/vehicles/${id}`, {
      method: "DELETE"
    });
  },

  async purchaseVehicle(id: string): Promise<Vehicle> {
    const data = await request<{ vehicle: Vehicle }>(`/api/vehicles/${id}/purchase`, {
      method: "POST"
    });
    return data.vehicle;
  },

  async restockVehicle(id: string, increment: number): Promise<Vehicle> {
    const data = await request<{ vehicle: Vehicle }>(`/api/vehicles/${id}/restock`, {
      method: "POST",
      body: JSON.stringify({ quantity: increment })
    });
    return data.vehicle;
  }
};
