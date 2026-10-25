import React from "react";
import { Vehicle } from "../types/vehicle.js";
import { formatPaiseToINR } from "../utils/currency.js";

interface VehicleCardProps {
  vehicle: Vehicle;
  isAdminView: boolean;
  isPurchasing: boolean;
  onPurchase: (id: string) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onRestock?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  isAdminView,
  isPurchasing,
  onPurchase,
  onEdit,
  onRestock,
  onDelete
}) => {
  const isOutOfStock = vehicle.quantity === 0;

  return (
    <article
      className="bg-surface border border-border rounded-card p-5 shadow-sm flex flex-col justify-between hover:border-accent/40 transition-colors"
      aria-labelledby={`vehicle-heading-${vehicle.id}`}
    >
      {/* Header Info */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-accent-light text-accent uppercase tracking-wider">
            {vehicle.category}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              isOutOfStock
                ? "bg-red-50 text-error border border-red-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {isOutOfStock ? "Out of Stock" : `${vehicle.quantity} Available`}
          </span>
        </div>

        <h3 id={`vehicle-heading-${vehicle.id}`} className="text-lg font-bold text-primary tracking-tight">
          {vehicle.make} {vehicle.model}
        </h3>

        <div className="mt-3 mb-4">
          <span className="text-xs text-secondary block font-medium">Offered At</span>
          <span className="text-2xl font-extrabold text-primary tracking-tight">
            {formatPaiseToINR(vehicle.price)}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-border/60">
        {!isAdminView ? (
          /* Buyer Flow */
          <button
            type="button"
            disabled={isOutOfStock || isPurchasing}
            onClick={() => onPurchase(vehicle.id)}
            className={`w-full py-2.5 px-4 rounded-control text-sm font-semibold tracking-wide transition-all shadow-sm focus-visible:ring-2 flex items-center justify-center space-x-2 ${
              isOutOfStock
                ? "bg-slate-100 text-secondary/60 cursor-not-allowed border border-border"
                : isPurchasing
                ? "bg-accent/70 text-white cursor-wait"
                : "bg-accent hover:bg-accent-hover text-white active:scale-[0.99]"
            }`}
            aria-label={
              isOutOfStock
                ? `${vehicle.make} ${vehicle.model} is out of stock`
                : `Purchase 1 unit of ${vehicle.make} ${vehicle.model}`
            }
          >
            {isPurchasing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <span>Purchase (1 Unit)</span>
            )}
          </button>
        ) : (
          /* Admin Management Flow */
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onEdit?.(vehicle)}
              className="py-1.5 px-2 rounded-control border border-border text-xs font-semibold text-primary hover:border-accent hover:text-accent transition-colors focus-visible:ring-1"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onRestock?.(vehicle)}
              className="py-1.5 px-2 rounded-control bg-accent-light text-accent text-xs font-semibold hover:bg-accent hover:text-white transition-colors focus-visible:ring-1"
            >
              Restock
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(vehicle)}
              className="py-1.5 px-2 rounded-control border border-red-200 text-xs font-semibold text-error hover:bg-red-50 transition-colors focus-visible:ring-1"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
