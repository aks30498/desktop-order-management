import { Routes, Route } from "react-router-dom";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

import OrdersView from "@/components/OrdersView";
import OrderDetailsPage from "@/pages/OrderDetailsPage";
import CustomersPage from "@/pages/CustomersPage";

export default function Router() {
  return (
    <div className="app h-screen flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<OrdersView />} />
            <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
