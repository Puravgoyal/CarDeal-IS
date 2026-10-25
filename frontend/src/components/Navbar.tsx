import React from "react";
import { useAuth } from "../context/AuthContext.js";

interface NavbarProps {
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdminView, onToggleAdminView }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-control bg-accent flex items-center justify-center text-white font-bold tracking-wider text-lg shadow-sm">
            CD
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-primary block leading-tight">
              CarDeal IS
            </span>
            <span className="text-xs text-secondary hidden sm:block">
              Inventory & Dealership Management
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user && (
            <>
              {/* User info */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-primary truncate max-w-[180px]">
                  {user.email}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">
                  {user.role === "admin" ? "Administrator" : "Standard Buyer"}
                </span>
              </div>

              {/* Admin toggle if applicable */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={onToggleAdminView}
                  className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-colors focus-visible:ring-2 ${
                    isAdminView
                      ? "bg-accent text-white shadow-sm"
                      : "bg-accent-light text-accent hover:bg-accent hover:text-white"
                  }`}
                  aria-pressed={isAdminView}
                >
                  {isAdminView ? "Catalog View" : "Manage Inventory"}
                </button>
              )}

              {/* Logout CTA */}
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-control border border-border text-xs font-medium text-secondary hover:text-primary hover:border-secondary transition-colors focus-visible:ring-2"
                aria-label="Log out of session"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
