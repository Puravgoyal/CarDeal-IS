import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthContext.js";
import { Navbar } from "./components/Navbar.js";
import { AuthView } from "./components/AuthView.js";
import { FilterSidebar } from "./components/FilterSidebar.js";
import { VehicleCard } from "./components/VehicleCard.js";
import { AdminModal, AdminModalMode } from "./components/AdminModal.js";
import { ToastContainer, ToastMessage } from "./components/Toast.js";
import { Vehicle, VehicleFilters } from "./types/vehicle.js";
import { api } from "./api/client.js";

export const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<VehicleFilters>({});
  const [isAdminView, setIsAdminView] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Admin Modal State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState<AdminModalMode>("add");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Prevent stale search responses
  const latestSearchId = useRef(0);

  const addToast = (type: ToastMessage["type"], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchVehicles = async (filters: VehicleFilters = activeFilters) => {
    const searchId = ++latestSearchId.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await api.searchVehicles(filters);
      // Discard stale responses
      if (searchId === latestSearchId.current) {
        setVehicles(data);
      }
    } catch (err: any) {
      if (searchId === latestSearchId.current) {
        setLoadError(err.message || "Failed to load vehicle catalog.");
      }
    } finally {
      if (searchId === latestSearchId.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchVehicles();
    }
  }, [isAuthenticated]);

  const handleApplyFilters = (filters: VehicleFilters) => {
    setActiveFilters(filters);
    fetchVehicles(filters);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    fetchVehicles({});
  };

  // Purchase Flow
  const handlePurchase = async (id: string) => {
    if (purchasingId) return; // Prevent duplicate clicks
    const target = vehicles.find((v) => v.id === id);
    if (!target) return;

    setPurchasingId(id);

    try {
      const updatedVehicle = await api.purchaseVehicle(id);
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? updatedVehicle : v))
      );
      addToast(
        "success",
        "Purchase Confirmed",
        `Purchased 1 unit of ${target.make} ${target.model}. Remaining stock: ${updatedVehicle.quantity}.`
      );
    } catch (err: any) {
      if (err.code === "OUT_OF_STOCK") {
        addToast(
          "error",
          "Stock Conflict",
          `Unable to purchase ${target.make} ${target.model}. This vehicle is now out of stock.`
        );
        // Refresh catalog to sync latest state
        fetchVehicles();
      } else {
        addToast(
          "error",
          "Purchase Failed",
          err.message || "An error occurred while processing your purchase. Please refresh."
        );
      }
    } finally {
      setPurchasingId(null);
    }
  };

  // Admin Modal Handlers
  const handleOpenAdd = () => {
    setSelectedVehicle(null);
    setAdminModalMode("add");
    setAdminModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setSelectedVehicle(v);
    setAdminModalMode("edit");
    setAdminModalOpen(true);
  };

  const handleOpenRestock = (v: Vehicle) => {
    setSelectedVehicle(v);
    setAdminModalMode("restock");
    setAdminModalOpen(true);
  };

  const handleOpenDelete = (v: Vehicle) => {
    setSelectedVehicle(v);
    setAdminModalMode("delete");
    setAdminModalOpen(true);
  };

  const handleSaveAdd = async (data: {
    make: string;
    model: string;
    category: string;
    pricePaise: number;
    quantity: number;
  }) => {
    const newVehicle = await api.createVehicle(data);
    setVehicles((prev) => [newVehicle, ...prev]);
    addToast("success", "Vehicle Added", `Added ${newVehicle.make} ${newVehicle.model} to inventory.`);
  };

  const handleSaveEdit = async (
    id: string,
    data: { make: string; model: string; category: string; pricePaise: number }
  ) => {
    const updated = await api.updateVehicle(id, data);
    setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
    addToast("success", "Vehicle Updated", `Updated details for ${updated.make} ${updated.model}.`);
  };

  const handleSaveRestock = async (id: string, increment: number) => {
    const updated = await api.restockVehicle(id, increment);
    setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
    addToast(
      "success",
      "Stock Replenished",
      `Added +${increment} units to ${updated.make} ${updated.model}. Total stock: ${updated.quantity}.`
    );
  };

  const handleConfirmDelete = async (id: string) => {
    const target = vehicles.find((v) => v.id === id);
    await api.deleteVehicle(id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    addToast(
      "info",
      "Vehicle Removed",
      `Deleted ${target?.make || "vehicle"} ${target?.model || ""} from inventory.`
    );
  };

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col">
      <Navbar
        isAdminView={isAdminView}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              {isAdminView ? "Inventory Management" : "Vehicle Inventory"}
            </h1>
            <p className="text-sm text-secondary mt-1">
              {isLoading
                ? "Searching catalog..."
                : `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} ${
                    activeFilterCount > 0 ? "matching filters" : "available"
                  }`}
            </p>
          </div>

          {isAdmin && isAdminView && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="py-2.5 px-4 rounded-control bg-accent hover:bg-accent-hover text-white text-sm font-semibold tracking-wide transition-colors shadow-sm flex items-center justify-center space-x-1.5 focus-visible:ring-2"
            >
              <span>+ Add New Vehicle</span>
            </button>
          )}
        </div>

        {/* Catalog Main Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Filter Sidebar */}
          <FilterSidebar
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            activeCount={activeFilterCount}
          />

          {/* Catalog Grid Area */}
          <section className="flex-1 w-full" aria-label="Vehicle Catalog">
            {/* Loading State */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface border border-border rounded-card p-5 animate-pulse space-y-4"
                  >
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-10 bg-slate-200 rounded w-full pt-4"></div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              /* Error State */
              <div className="bg-surface border border-red-200 rounded-card p-8 text-center max-w-lg mx-auto">
                <span className="text-3xl mb-2 block">⚠️</span>
                <h3 className="text-lg font-bold text-error mb-2">Unable to Load Vehicles</h3>
                <p className="text-sm text-secondary mb-4">{loadError}</p>
                <button
                  type="button"
                  onClick={() => fetchVehicles()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-control transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : vehicles.length === 0 ? (
              /* Empty State */
              <div className="bg-surface border border-border rounded-card p-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-secondary text-xl">
                  🔍
                </div>
                <h3 className="text-base font-bold text-primary mb-1">
                  {activeFilterCount > 0 ? "No Matching Vehicles" : "Inventory is Empty"}
                </h3>
                <p className="text-xs text-secondary mb-4 leading-relaxed">
                  {activeFilterCount > 0
                    ? "No vehicles match the specified search parameters. Try adjusting or clearing your filters."
                    : "There are currently no vehicles registered in the dealership inventory."}
                </p>
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3.5 py-1.5 rounded-control bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : isAdmin ? (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-3.5 py-1.5 rounded-control bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                  >
                    Add First Vehicle
                  </button>
                ) : null}
              </div>
            ) : (
              /* Vehicle Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isAdminView={isAdminView}
                    isPurchasing={purchasingId === v.id}
                    onPurchase={handlePurchase}
                    onEdit={handleOpenEdit}
                    onRestock={handleOpenRestock}
                    onDelete={handleOpenDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Admin Operations Modal */}
      <AdminModal
        mode={adminModalMode}
        vehicle={selectedVehicle}
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSaveAdd={handleSaveAdd}
        onSaveEdit={handleSaveEdit}
        onSaveRestock={handleSaveRestock}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppContent />
  );
};
