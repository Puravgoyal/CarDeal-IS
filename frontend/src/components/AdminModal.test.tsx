import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminModal } from "./AdminModal.js";
import { Vehicle } from "../types/vehicle.js";

describe("AdminModal Component", () => {
  const dummyVehicle: Vehicle = {
    id: "veh-1",
    make: "Honda",
    model: "Civic",
    category: "Sedan",
    price: 150000000,
    quantity: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it("rejects fractional or malformed stock strings on add vehicle", async () => {
    const onSaveAdd = vi.fn();
    render(
      <AdminModal
        mode="add"
        vehicle={null}
        isOpen={true}
        onClose={vi.fn()}
        onSaveAdd={onSaveAdd}
        onSaveEdit={vi.fn()}
        onSaveRestock={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Make \/ Brand/i), { target: { value: "Toyota" } });
    fireEvent.change(screen.getByLabelText(/Model/i), { target: { value: "Corolla" } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "Sedan" } });
    fireEvent.change(screen.getByLabelText(/Price in Rupees/i), { target: { value: "2000000" } });

    // Test fractional quantity "2.5"
    const qtyInput = screen.getByLabelText(/Initial Stock Units/i);
    fireEvent.change(qtyInput, { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Vehicle" }));

    expect(await screen.findByText(/Quantity must be a non-negative whole integer/i)).toBeInTheDocument();
    expect(onSaveAdd).not.toHaveBeenCalled();

    // Test malformed string "5abc"
    fireEvent.change(qtyInput, { target: { value: "5abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Vehicle" }));

    expect(await screen.findByText(/Quantity must be a non-negative whole integer/i)).toBeInTheDocument();
    expect(onSaveAdd).not.toHaveBeenCalled();
  });

  it("rejects fractional or non-positive increment strings on restock", async () => {
    const onSaveRestock = vi.fn();
    render(
      <AdminModal
        mode="restock"
        vehicle={dummyVehicle}
        isOpen={true}
        onClose={vi.fn()}
        onSaveAdd={vi.fn()}
        onSaveEdit={vi.fn()}
        onSaveRestock={onSaveRestock}
        onConfirmDelete={vi.fn()}
      />
    );

    const incInput = screen.getByLabelText(/Units to Add/i);

    // Test fractional increment
    fireEvent.change(incInput, { target: { value: "3.14" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Restock" }));
    expect(await screen.findByText(/Restock increment must be a positive whole integer/i)).toBeInTheDocument();
    expect(onSaveRestock).not.toHaveBeenCalled();

    // Test zero increment
    fireEvent.change(incInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Restock" }));
    expect(await screen.findByText(/Restock increment must be a positive whole integer/i)).toBeInTheDocument();
    expect(onSaveRestock).not.toHaveBeenCalled();
  });

  it("invokes onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <AdminModal
        mode="add"
        vehicle={null}
        isOpen={true}
        onClose={onClose}
        onSaveAdd={vi.fn()}
        onSaveEdit={vi.fn()}
        onSaveRestock={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("traps focus within dialog elements on Tab and Shift+Tab", () => {
    render(
      <AdminModal
        mode="add"
        vehicle={null}
        isOpen={true}
        onClose={vi.fn()}
        onSaveAdd={vi.fn()}
        onSaveEdit={vi.fn()}
        onSaveRestock={vi.fn()}
        onConfirmDelete={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus last element and press Tab -> should wrap to first
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // Focus first element and press Shift+Tab -> should wrap to last
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
