// src/renderer/App.jsx
import "./styles/main.css";
import "./styles/components.css";

import { useState, useCallback } from "react";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import OrdersView from "./components/OrdersView";
import OrderFormView from "./components/OrderFormView.jsx";
import OrderDetailModal from "./components/OrderDetailModal";
import BarcodeModal from "./components/BarcodeModal";

import { useAppRuntime } from "./hooks/useAppRuntime";
import { useIpcCommands } from "./hooks/useIpcCommands";

export default function App() {
  // --------------------
  // App Runtime (replaces app.js)
  // --------------------
  const { isReady, fatalError } = useAppRuntime();

  // --------------------
  // View State (replaces MainView)
  // --------------------
  const [activeView, setActiveView] = useState("orders");
  // "orders" | "form" | "detail"

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  const showOrders = useCallback(() => setActiveView("orders"), []);
  const showForm = useCallback(() => setActiveView("form"), []);
  const showDetail = useCallback(() => setActiveView("detail"), []);

  // --------------------
  // IPC Commands
  // --------------------
  useIpcCommands({
    onRefresh: () => {
      console.log("IPC refresh received");
      // Later: trigger OrdersView reload
    },
    onRestart: () => {
      console.log("IPC restart received");
      location.reload();
    },
  });

  // --------------------
  // Fatal state handling
  // --------------------
  if (fatalError) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "#ef4444" }}>Application Failed to Initialize</h2>
        <pre>{fatalError.message}</pre>
        <button onClick={() => location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isReady) {
    return <div className="loading">Loading application...</div>;
  }

  // --------------------
  // Normal UI
  // --------------------
  return (
    <div className="app">
      <Header
        onHome={showOrders}
        onNewOrder={showForm}
        onScanBarcode={() => setIsBarcodeOpen(true)}
      />

      <div className="app-body">
        <Sidebar
          onAddOrder={showForm}
          onSearchChange={(value) => {
            // TODO: forward to OrdersView later
            console.log("search:", value);
          }}
          onStatusChange={(value) => {
            console.log("status filter:", value);
          }}
          onPaymentChange={(value) => {
            console.log("payment filter:", value);
          }}
        />

        <main className="main-content">
          <div className="content-area">
            {activeView === "orders" && (
              <OrdersView
                onOpenOrder={(order) => {
                  setSelectedOrder(order);
                  showDetail();
                }}
              />
            )}

            {activeView === "form" && <OrderFormView onClose={showOrders} />}

            {activeView === "detail" && (
              <OrderDetailModal
                open={activeView === "detail"}
                order={selectedOrder}
                onClose={() => {
                  setSelectedOrder(null);
                  showOrders();
                }}
              />
            )}
          </div>
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <span className="status-indicator">Ready</span>
          <span className="last-sync">Last updated: Never</span>
        </div>
      </footer>

      <BarcodeModal
        open={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onOrderFound={(order) => {
          setSelectedOrder(order);
          setActiveView("detail");
        }}
      />
    </div>
  );
}
