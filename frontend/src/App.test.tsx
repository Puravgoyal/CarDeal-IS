import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App.js";
import { AuthProvider } from "./context/AuthContext.js";

describe("Frontend App Integration", () => {
  it("renders authentication view when user is not logged in", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: "CarDeal IS" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("validates password length bounds on login form submission", async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByPlaceholderText("••••••••••••");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(emailInput, { target: { value: "test@cardeal.com" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Password must be at least 12 characters long/i)).toBeInTheDocument();
  });
});
