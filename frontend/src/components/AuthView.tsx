import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export const AuthView: React.FC = () => {
  const { login, register, sessionMessage, clearSessionMessage } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters long.";
    } else if (password.length > 128) {
      errors.password = "Password must not exceed 128 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegisterSuccessMessage(null);
    clearSessionMessage();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password);
        setRegisterSuccessMessage("Registration successful! Please sign in with your credentials.");
        setIsRegister(false);
        setPassword("");
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-card border border-border p-6 sm:p-8 shadow-sm">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-control bg-accent text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-sm">
            CD
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">CarDeal IS</h1>
          <p className="text-sm text-secondary mt-1">
            Sign in to access inventory, search vehicles, and manage purchases.
          </p>
        </div>

        {/* In-Memory Session Notice */}
        <div className="mb-5 bg-accent-light text-accent border border-accent/20 rounded-control p-3 text-xs leading-relaxed">
          <span className="font-semibold block mb-0.5">Note on In-Memory Authentication:</span>
          Tokens are retained in client memory without local storage. Reloading the browser clears the session and requires signing in again.
        </div>

        {/* Session Expired Notice */}
        {sessionMessage && (
          <div className="mb-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-control p-3 text-xs" role="alert">
            {sessionMessage}
          </div>
        )}

        {/* Success Notice */}
        {registerSuccessMessage && (
          <div className="mb-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-control p-3 text-xs" role="alert">
            {registerSuccessMessage}
          </div>
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="mb-4 bg-red-50 text-error border border-red-200 rounded-control p-3 text-xs" role="alert">
            {error}
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-border mb-6" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            onClick={() => {
              setIsRegister(false);
              setError(null);
              setRegisterSuccessMessage(null);
            }}
            className={`flex-1 pb-2.5 text-sm font-semibold transition-colors border-b-2 text-center ${
              !isRegister
                ? "border-accent text-accent"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            onClick={() => {
              setIsRegister(true);
              setError(null);
              setRegisterSuccessMessage(null);
            }}
            className={`flex-1 pb-2.5 text-sm font-semibold transition-colors border-b-2 text-center ${
              isRegister
                ? "border-accent text-accent"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            Register
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-primary mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. buyer@dealership.com"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className={`w-full px-3 py-2 rounded-control border text-sm text-primary placeholder-secondary/50 focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.email
                  ? "border-error focus:ring-error/20"
                  : "border-border focus:border-accent focus:ring-accent/20"
              }`}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-error mt-1" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-primary mb-1">
              Password <span className="font-normal text-secondary">(12–128 characters)</span>
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`w-full px-3 py-2 pr-12 rounded-control border text-sm text-primary placeholder-secondary/50 focus:outline-none focus:ring-2 transition-colors ${
                  fieldErrors.password
                    ? "border-error focus:ring-error/20"
                    : "border-border focus:border-accent focus:ring-accent/20"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-secondary hover:text-primary px-1.5 py-0.5 rounded focus-visible:ring-1"
                aria-label={showPassword ? "Hide password characters" : "Show password characters"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-error mt-1" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-control bg-accent hover:bg-accent-hover text-white text-sm font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2"
          >
            {isSubmitting
              ? isRegister
                ? "Creating Account..."
                : "Signing In..."
              : isRegister
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};
