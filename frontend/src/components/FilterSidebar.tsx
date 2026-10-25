import React, { useState } from "react";
import { VehicleFilters } from "../types/vehicle.js";
import { validateRupeeInput } from "../utils/currency.js";

interface FilterSidebarProps {
  onApplyFilters: (filters: VehicleFilters) => void;
  onClearFilters: () => void;
  activeCount: number;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  onApplyFilters,
  onClearFilters,
  activeCount
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [minRupees, setMinRupees] = useState("");
  const [maxRupees, setMaxRupees] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);

    // Validate prices if provided
    if (minRupees.trim()) {
      const err = validateRupeeInput(minRupees);
      if (err) {
        setPriceError(`Min Price: ${err}`);
        return;
      }
    }
    if (maxRupees.trim()) {
      const err = validateRupeeInput(maxRupees);
      if (err) {
        setPriceError(`Max Price: ${err}`);
        return;
      }
    }
    if (minRupees.trim() && maxRupees.trim()) {
      if (Number(minRupees.trim()) > Number(maxRupees.trim())) {
        setPriceError("Minimum price cannot be greater than maximum price.");
        return;
      }
    }

    onApplyFilters({
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      category: category.trim() || undefined,
      minRupees: minRupees.trim() || undefined,
      maxRupees: maxRupees.trim() || undefined
    });
  };

  const handleClear = () => {
    setMake("");
    setModel("");
    setCategory("");
    setMinRupees("");
    setMaxRupees("");
    setPriceError(null);
    onClearFilters();
  };

  const hasFiltersApplied = !!(make || model || category || minRupees || maxRupees);

  return (
    <aside className="w-full lg:w-64 shrink-0">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="w-full py-2.5 px-4 bg-surface rounded-control border border-border text-sm font-semibold text-primary flex items-center justify-between shadow-sm focus-visible:ring-2"
          aria-expanded={isOpenMobile}
        >
          <span>Search & Filters {activeCount > 0 ? `(${activeCount} active)` : ""}</span>
          <span className="text-secondary text-xs">{isOpenMobile ? "▲ Hide" : "▼ Show"}</span>
        </button>
      </div>

      {/* Filter Card Content */}
      <div
        className={`${
          isOpenMobile ? "block" : "hidden"
        } lg:block bg-surface border border-border rounded-card p-5 shadow-sm`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <h2 className="text-base font-bold text-primary tracking-tight">Filter Catalog</h2>
          {hasFiltersApplied && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-accent hover:underline font-semibold focus-visible:ring-1"
            >
              Reset All
            </button>
          )}
        </div>

        {priceError && (
          <div className="mb-4 bg-red-50 text-error border border-red-200 rounded-control p-2.5 text-xs" role="alert">
            {priceError}
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4">
          {/* Make Filter */}
          <div>
            <label htmlFor="filter-make" className="block text-xs font-semibold text-primary mb-1">
              Make / Manufacturer
            </label>
            <input
              id="filter-make"
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Toyota, Honda"
              className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Model Filter */}
          <div>
            <label htmlFor="filter-model" className="block text-xs font-semibold text-primary mb-1">
              Model
            </label>
            <input
              id="filter-model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Civic, Camry"
              className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="filter-category" className="block text-xs font-semibold text-primary mb-1">
              Category
            </label>
            <input
              id="filter-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Sedan, SUV, Electric"
              className="w-full px-3 py-1.5 rounded-control border border-border text-sm text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Price Range */}
          <div>
            <span className="block text-xs font-semibold text-primary mb-1">Price Range (₹ Rupees)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter-min-price" className="sr-only">
                  Minimum Price in Rupees
                </label>
                <input
                  id="filter-min-price"
                  type="text"
                  value={minRupees}
                  onChange={(e) => setMinRupees(e.target.value)}
                  placeholder="Min ₹"
                  className="w-full px-2.5 py-1.5 rounded-control border border-border text-xs text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="filter-max-price" className="sr-only">
                  Maximum Price in Rupees
                </label>
                <input
                  id="filter-max-price"
                  type="text"
                  value={maxRupees}
                  onChange={(e) => setMaxRupees(e.target.value)}
                  placeholder="Max ₹"
                  className="w-full px-2.5 py-1.5 rounded-control border border-border text-xs text-primary placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col space-y-2">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-control bg-accent hover:bg-accent-hover text-white text-xs font-semibold tracking-wide transition-colors shadow-sm focus-visible:ring-2"
            >
              Apply Filters
            </button>
            {hasFiltersApplied && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full py-1.5 px-3 rounded-control border border-border text-xs text-secondary hover:text-primary transition-colors focus-visible:ring-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>
    </aside>
  );
};
