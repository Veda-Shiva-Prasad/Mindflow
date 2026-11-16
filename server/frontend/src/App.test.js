import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("Mindflow displays the login screen when logged out", () => {
  localStorage.removeItem("mindflow_token");

  render(<App />);

  expect(
    screen.getByRole("heading", {
      name: /welcome back/i,
    }),
  ).toBeTruthy();
});
