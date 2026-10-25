import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthView } from "./AuthView.js";
import { AuthProvider } from "../context/AuthContext.js";
import { api } from "../api/client.js";

describe("AuthView Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("displays invalid credentials error and does NOT display session expired message on bad password", async () => {
    vi.spyOn(api, "login").mockRejectedValue({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password."
    });

    render(
      <AuthProvider>
        <AuthView />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "user@cardeal.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••••••"), { target: { value: "WrongPassword123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(screen.queryByText(/Your session has expired/i)).not.toBeInTheDocument();
  });
});
