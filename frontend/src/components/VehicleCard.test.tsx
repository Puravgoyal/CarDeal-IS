import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleCard } from "./VehicleCard.js";
import { Vehicle } from "../types/vehicle.js";

describe("VehicleCard Component", () => {
  const sampleVehicle: Vehicle = {
    id: "v-1",
    make: "Toyota",
    model: "Camry",
    category: "Sedan",
    price: 320000000, // INR 32,00,000 in paise
    quantity: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it("renders vehicle brand, model, category, and formatted rupee price", () => {
    render(
      <VehicleCard
        vehicle={sampleVehicle}
        isAdminView={false}
        isPurchasing={false}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getByText("Toyota Camry")).toBeInTheDocument();
    expect(screen.getByText("Sedan")).toBeInTheDocument();
    expect(screen.getByText("₹32,00,000")).toBeInTheDocument();
    expect(screen.getByText("3 Available")).toBeInTheDocument();
  });

  it("disables purchase button and displays Out of Stock badge when quantity is 0", () => {
    const zeroStockVehicle: Vehicle = { ...sampleVehicle, quantity: 0 };
    render(
      <VehicleCard
        vehicle={zeroStockVehicle}
        isAdminView={false}
        isPurchasing={false}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getAllByText("Out of Stock").length).toBeGreaterThanOrEqual(1);
    const purchaseButton = screen.getByRole("button", { name: /out of stock/i });
    expect(purchaseButton).toBeDisabled();
  });

  it("disables purchase button and shows spinner while purchase request is in-flight", () => {
    render(
      <VehicleCard
        vehicle={sampleVehicle}
        isAdminView={false}
        isPurchasing={true}
        onPurchase={vi.fn()}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("calls onPurchase callback when purchase button is clicked", () => {
    const onPurchaseMock = vi.fn();
    render(
      <VehicleCard
        vehicle={sampleVehicle}
        isAdminView={false}
        isPurchasing={false}
        onPurchase={onPurchaseMock}
      />
    );

    const button = screen.getByRole("button", { name: /purchase/i });
    fireEvent.click(button);
    expect(onPurchaseMock).toHaveBeenCalledWith("v-1");
  });

  it("renders Edit, Restock, and Delete buttons in Admin view mode", () => {
    render(
      <VehicleCard
        vehicle={sampleVehicle}
        isAdminView={true}
        isPurchasing={false}
        onPurchase={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
