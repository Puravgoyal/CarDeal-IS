export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number; // in integer paise
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleFilters {
  make?: string;
  model?: string;
  category?: string;
  minRupees?: string;
  maxRupees?: string;
}

export interface CreateVehicleInput {
  make: string;
  model: string;
  category: string;
  pricePaise: number;
  quantity: number;
}

export interface UpdateVehicleInput {
  make: string;
  model: string;
  category: string;
  pricePaise: number;
}
