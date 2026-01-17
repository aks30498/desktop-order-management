import { useEffect, useMemo, useState } from "react";
import OrderDetailModal from "./OrderDetailModal";
import OrderRow from "./OrderRow";

const PAGE_SIZE = 50;

export default function OrdersView({ onOpenOrder }) {
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // ----------------------
  // Load orders
  // ----------------------
  useEffect(() => {
    loadOrders();
  }, [tab]);

  async function loadOrders() {
    try {
      setLoading(true);

      let result;
      switch (tab) {
        case "today":
          result = await Helpers.ipcInvoke("get-todays-orders");
          break;
        case "week":
          result = await Helpers.ipcInvoke("get-weeks-orders");
          break;
        case "delivered":
          result = await Helpers.ipcInvoke("get-orders", { status: "delivered" });
          break;
        case "pending":
          result = await Helpers.ipcInvoke("get-orders", { status: "pending" });
          break;
        case "deleted":
          result = await Helpers.ipcInvoke("get-orders", { deleted: true });
          break;
        default:
          result = await Helpers.ipcInvoke("get-orders", {});
      }

      if (!result.success) throw new Error(result.error);

      setOrders(result.orders || []);
      setPage(1);
    } catch (err) {
      console.error("Failed to load orders", err);
      notifications.error("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // ----------------------
  // Filter + sort (derived)
  // ----------------------
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(term) ||
          o.phone_number.includes(term)
      );
    }

    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (paymentFilter) {
      list = list.filter((o) => o.payment_status === paymentFilter);
    }

    return Helpers.sortOrders(list, sort);
  }, [orders, search, statusFilter, paymentFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  const pageOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  // ----------------------
  // Actions
  // ----------------------
  const refresh = () => loadOrders();

  const handleDelete = async (orderId) => {
    const confirmed = await Helpers.showConfirm(
      "This will move the order to Deleted tab. Continue?",
      "Delete Order"
    );
    if (!confirmed) return;

    await Helpers.ipcInvoke("delete-order", orderId);
    notifications.success("Order moved to Deleted");
    refresh();
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <div className="orders-view">
      {/* Tabs */}
      <div className="tabs">
        {["all", "today", "week", "delivered", "pending", "deleted"].map(
          (t) => (
            <button
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          )
        )}
      </div>

      {/* Controls */}
      <div className="orders-controls">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="">All Payment</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="date-desc">Date ↓</option>
          <option value="date-asc">Date ↑</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>

        <button onClick={refresh}>Refresh</button>
      </div>

      {/* Content */}
      {loading && <div className="loading">Loading orders...</div>}

      {!loading && pageOrders.length === 0 && (
        <div className="no-orders">No orders found</div>
      )}

      {!loading && pageOrders.length > 0 && (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>

         <tbody>
         {pageOrders.map((order) => (
            <OrderRow
                key={order.id}
                order={order}
                onView={onOpenOrder}
                onDelete={handleDelete}
                onStatusChange={async (id, status) => {
                    await Helpers.ipcInvoke("update-order-status", id, status);
                    refresh();
                }}
                onPaymentStatusChange={async (id, status) => {
                    await Helpers.ipcInvoke("update-payment-status", id, status);
                    refresh();
                }}
            />
         ))}
        </tbody>

        </table>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
          setSelectedOrder(updated);
        }}
      />
    </div>
  );
}
