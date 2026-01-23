import { useEffect, useMemo, useState } from "react";
import OrderDetailModal from "./OrderDetailModal";
import OrderRow from "./OrderRow";
import Helpers from "@/utils/helpers";
import PaginationControl from "./PaginationControl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { Table, TableHeader, TableRow, TableHead, TableBody } from "./ui/table";

const PAGE_SIZE = 10;

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
          result = await Helpers.ipcInvoke("get-orders", {
            status: "delivered",
          });
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
          o.phone_number.includes(term),
      );
    }

    if (statusFilter && statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (paymentFilter && paymentFilter !== "all") {
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
      "Delete Order",
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
      <div className="space-y-4">
        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="deleted">Deleted</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-[220px]"
            placeholder="Search customer or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date ↓</SelectItem>
              <SelectItem value="date-asc">Date ↑</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading && <div className="loading">Loading orders...</div>}

      {!loading && pageOrders.length === 0 && (
        <div className="no-orders">No orders found</div>
      )}

      {!loading && pageOrders.length > 0 && (
        <div className="rounded-lg border overflow-hidden mt-8">
          <Table>
            <TableHeader className="bg-primary [&_th]:text-white">
              <TableRow className="text-white hover:bg-primary">
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Order time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
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
                    await Helpers.ipcInvoke(
                      "update-payment-status",
                      id,
                      status,
                    );
                    refresh();
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <PaginationControl
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={(updated) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o)),
          );
          setSelectedOrder(updated);
        }}
      />
    </div>
  );
}
