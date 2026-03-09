import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import cookies from "js-cookie";
import { Login } from "./Login";
import { Toaster } from "sonner";

const session = cookies.get("_session");

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Toaster richColors position="top-right" />
    {session ? <App /> : <Login />}
  </StrictMode>
);
