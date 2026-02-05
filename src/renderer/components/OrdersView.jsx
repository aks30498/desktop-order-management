import { useEffect, useState } from "react";
import Helpers from "@/utils/helpers";
import PaginationControl from "./PaginationControl";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from "@/components/ui/table";

import OrderRow from "./OrderRow";

const PAGE_SIZE = 10;

export default function OrdersView() {
  const navigate = useNavigate();

  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);

  // ----------------------
  // Load orders (SERVER SIDE)
  // ----------------------
  async function loadOrders(pageNumber = 1) {
    try {
      setLoading(true);

      const result = await Helpers.ipcInvoke("get-orders", {
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        paymentStatus: paymentFilter === "all" ? undefined : paymentFilter,
        sort,
        limit: PAGE_SIZE,
        offset: (pageNumber - 1) * PAGE_SIZE,
      });

      if (!result.success) throw new Error(result.error);

      setOrders(result.orders || []);
      setTotalCount(result.total || 0);
      setPage(pageNumber);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // reload when filters change
  useEffect(() => {
    loadOrders(1);
  }, [search, statusFilter, paymentFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const refresh = () => loadOrders(page);

  // ----------------------
  // Render
  // ----------------------
  return (
    <div className="space-y-6 p-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-[220px]"
          placeholder="Search customer or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {/* Table */}
      {loading && <div>Loading orders...</div>}

      {!loading && orders.length === 0 && (
        <div className="text-muted-foreground">No orders found</div>
      )}

      {!loading && orders.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-primary [&_th]:text-white">
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            {console.log("orders", orders)}
            <TableBody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => navigate(`/orders/${order.id}`)}
                  onDelete={async (id) => {
                    await Helpers.ipcInvoke("delete-order", id);
                    refresh();
                  }}
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
        onPageChange={(p) => loadOrders(p)}
      />
    </div>
  );
}
