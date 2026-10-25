import React, { useState, useEffect, useRef } from "react";
import { Vehicle } from "../types/vehicle.js";
import { validateRupeeInput, rupeesToPaise, formatPaiseToINR } from "../utils/currency.js";

export type AdminModalMode = "add" | "edit" | "restock" | "delete";

interface AdminModalProps {
  mode: AdminModalMode;
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAdd: (data: { make: string; model: string; category: string; pricePaise: number; quantity: number }) => Promise<void>;
  onSaveEdit: (id: string, data: { make: string; model: string; category: string; pricePaise: number }) => Promise<void>;
  onSaveRestock: (id: string, increment: number) => Promise<void>;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  mode,
  vehicle,
  isOpen,
  onClose,
  onSaveAdd,
  onSaveEdit,
  onSaveRestock,
  onConfirmDelete
}) => {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [restockIncrement, setRestockIncrement] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalContainerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
      setError(null);
      setIsSubmitting(false);

      if (mode === "edit" && vehicle) {
        setMake(vehicle.make);
        setModel(vehicle.model);
        setCategory(vehicle.category);
        setPriceRupees(String(vehicle.price / 100));
      } else if (mode === "restock") {
        setRestockIncrement("5");
      } else if (mode === "add") {
        setMake("");
        setModel("");
        setCategory("");
        setPriceRupees("");
        setQuantity("1");
      }

      // Auto-focus the first interactive element or input inside modal
      const timer = setTimeout(() => {
        if (modalContainerRef.current) {
          const focusable = modalContainerRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Restore focus to launching element on close
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === "function") {
        previouslyFocusedElement.current.focus();
      }
    }
  }, [isOpen, mode, vehicle]);

  // Handle ESC key and Focus Trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalContainerRef.current) {
        const focusable = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);

      if (mode === "add") {
        if (!make.trim() || !model.trim() || !category.trim()) {
          throw new Error("Make, model, and category are required.");
        }
        const priceErr = validateRupeeInput(priceRupees);
        if (priceErr) throw new Error(priceErr);

        const trimmedQty = quantity.trim();
        if (!/^\d+$/.test(trimmedQty)) {
          throw new Error("Quantity must be a non-negative whole integer.");
        }
        const qtyNum = Number(trimmedQty);
        if (!Number.isSafeInteger(qtyNum) || qtyNum < 0) {
          throw new Error("Quantity must be a non-negative safe integer.");
        }

        const pricePaise = rupeesToPaise(priceRupees);
        await onSaveAdd({
          make: make.trim(),
          model: model.trim(),
          category: category.trim(),
          pricePaise,
          quantity: qtyNum
        });
        onClose();
      } else if (mode === "edit" && vehicle) {
        if (!make.trim() || !model.trim() || !category.trim()) {
          throw new Error("Make, model, and category are required.");
        }
        const priceErr = validateRupeeInput(priceRupees);
        if (priceErr) throw new Error(priceErr);

        const pricePaise = rupeesToPaise(priceRupees);
        await onSaveEdit(vehicle.id, {
          make: make.trim(),
          model: model.trim(),
          category: category.trim(),
          pricePaise
        });
        onClose();
      } else if (mode === "restock" && vehicle) {
        const trimmedInc = restockIncrement.trim();
        if (!/^[1-9]\d*$/.test(trimmedInc)) {
          throw new Error("Restock increment must be a positive whole integer.");
        }
        const incrementNum = Number(trimmedInc);
        if (!Number.isSafeInteger(incrementNum) || incrementNum <= 0) {
          throw new Error("Restock increment must be a positive safe integer.");
        }
        await onSaveRestock(vehicle.id, incrementNum);
        onClose();
      } else if (mode === "delete" && vehicle) {
        await onConfirmDelete(vehicle.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete operation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="bg-surface rounded-card border border-border w-full max-w-lg p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <h2 id="admin-modal-title" className="text-lg font-bold text-primary tracking-tight">
            {mode === "add" && "Add New Vehicle to Catalog"}
            {mode === "edit" && `Edit Vehicle Details (${vehicle?.make} ${vehicle?.model})`}
            {mode === "restock" && `Restock Units (${vehicle?.make} ${vehicle?.model})`}
            {mode === "delete" && "Confirm Vehicle Deletion"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary p-1 rounded-control focus-visible:ring-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-error border border-red-200 rounded-control p-3 text-xs" role="alert">
            {error}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {/* Add & Edit Form Fields */}
          {(mode === "add" || mode === "edit") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-make" className="block text-xs font-semibold text-primary mb-1">
                    Make / Brand
                  </label>
                  <input
                    id="modal-make"
                    type="text"
                    required
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Toyota"
                    className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="modal-model" className="block text-xs font-semibold text-primary mb-1">
                    Model
                  </label>
                  <input
                    id="modal-model"
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Camry"
                    className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="modal-category" className="block text-xs font-semibold text-primary mb-1">
                  Category
                </label>
                <input
                  id="modal-category"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Sedan, SUV, Electric, Coupe"
                  className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label htmlFor="modal-price" className="block text-xs font-semibold text-primary mb-1">
                  Price in Rupees (₹)
                </label>
                <input
                  id="modal-price"
                  type="text"
                  required
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
                <span className="text-[11px] text-secondary mt-1 block">
                  Automatically converted and stored in integer paise.
                </span>
              </div>

              {mode === "add" && (
                <div>
                  <label htmlFor="modal-qty" className="block text-xs font-semibold text-primary mb-1">
                    Initial Stock Units
                  </label>
                  <input
                    id="modal-qty"
                    type="number"
                    min="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              )}

              {mode === "edit" && (
                <div className="bg-slate-50 border border-border rounded-control p-3 text-xs text-secondary leading-relaxed">
                  <span className="font-semibold text-primary block mb-0.5">Quantity Excluded:</span>
                  Per project specifications, vehicle stock quantity cannot be edited directly via PUT. Use the Restock or Purchase flows to mutate stock.
                </div>
              )}
            </>
          )}

          {/* Restock Form */}
          {mode === "restock" && vehicle && (
            <div>
              <div className="mb-3 text-xs text-secondary">
                Current Stock: <span className="font-bold text-primary">{vehicle.quantity} units</span> | Price:{" "}
                <span className="font-bold text-primary">{formatPaiseToINR(vehicle.price)}</span>
              </div>
              <label htmlFor="modal-restock-inc" className="block text-xs font-semibold text-primary mb-1">
                Units to Add (+Increment)
              </label>
              <input
                id="modal-restock-inc"
                type="number"
                min="1"
                required
                value={restockIncrement}
                onChange={(e) => setRestockIncrement(e.target.value)}
                className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <span className="text-[11px] text-secondary mt-1 block">
                Stock is incremented atomically.
              </span>
            </div>
          )}

          {/* Delete Form Confirmation */}
          {mode === "delete" && vehicle && (
            <div className="py-2">
              <p className="text-sm text-primary leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <span className="font-bold text-error">
                  {vehicle.make} {vehicle.model}
                </span>{" "}
                (Category: {vehicle.category}, Price: {formatPaiseToINR(vehicle.price)})?
              </p>
              <p className="text-xs text-secondary mt-2">
                This action cannot be undone. The vehicle will be immediately removed from the catalog.
              </p>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-control border border-border text-xs font-semibold text-secondary hover:text-primary transition-colors focus-visible:ring-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-control text-xs font-semibold text-white tracking-wide transition-colors shadow-sm focus-visible:ring-2 ${
                mode === "delete"
                  ? "bg-error hover:bg-red-700"
                  : "bg-accent hover:bg-accent-hover"
              } disabled:opacity-50`}
            >
              {isSubmitting
                ? "Processing..."
                : mode === "add"
                ? "Save Vehicle"
                : mode === "edit"
                ? "Update Details"
                : mode === "restock"
                ? "Confirm Restock"
                : "Delete Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
