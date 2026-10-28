import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import "./styles/index.css";
import "./styles/app.css";
import "./styles/theme.css"; // SmartCart "Nocturne" theme: must stay last so it can refine the base styles

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ShopProvider>
            <App />
          </ShopProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
