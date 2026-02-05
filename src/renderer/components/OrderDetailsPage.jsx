import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Helpers from "@/utils/helpers";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ucFirst } from "@/utils/helper-functions";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [printing, setPrinting] = useState(false);

  // --------------------
  // Load order
  // --------------------
  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      setLoading(true);
      const result = await Helpers.ipcInvoke(
        "get-order-by-id",
        Number(orderId),
      );
      if (!result?.success) throw new Error(result?.error);
      setOrder(result.order);
    } catch (err) {
      console.error("Failed to load order", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load order details.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="p-6">
        <p>Order not found.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  // --------------------
  // Actions
  // --------------------
  const toggleStatus = async () => {
    try {
      setLoadingStatus(true);
      const newStatus = order.status === "pending" ? "delivered" : "pending";

      const result = await Helpers.ipcInvoke(
        "update-order-status",
        order.id,
        newStatus,
      );

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus}`,
      });
      setOrder(result);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update order status.",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const result = await Helpers.ipcInvoke("print-order", order.id);
      if (!result.success) throw new Error(result.error);
    } catch {
      toast({
        variant: "destructive",
        title: "Print Error",
        description: "Failed to print order.",
      });
    } finally {
      setPrinting(false);
    }
  };

  const viewImage = () => {
    if (!order.image_path) return;
    window.electronAPI?.openFile?.(order.image_path);
  };

  // --------------------
  // Render
  // --------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order #{order.id}</h1>

          <div className="flex gap-2 mt-2">
            <Badge
              variant={order.status === "delivered" ? "default" : "secondary"}
            >
              {ucFirst(order.status)}
            </Badge>

            <Badge
              variant={order.payment_status === "done" ? "success" : "outline"}
            >
              Payment: {ucFirst(order.payment_status)}
            </Badge>
          </div>
        </div>

        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
      </div>

      <Separator />

      {/* Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Customer Name</div>
            <div>{order.customer_name}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Contact</div>
            <div>{`${order.contact}${order.alternate_contact && `, ${order.alternate_contact}`}`}</div>
          </div>

          {order.weight && (
            <div>
              <div className="text-muted-foreground">Item Weight</div>
              <div>{order.weight}</div>
            </div>
          )}

          <div>
            <div className="text-muted-foreground">Order date & time</div>
            <div>
              {Helpers.formatDateTime(order.order_date, order.order_time)}
            </div>
          </div>

          {order.address && (
            <div className="col-span-2">
              <div className="text-muted-foreground">Address</div>
              <div>{order.address}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {order.order_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>{order.order_notes}</CardContent>
        </Card>
      )}

      {/* Image */}
      {order.image_path && (
        <Card>
          <CardHeader>
            <CardTitle>Reference</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <img
              src={`file://${order.image_path}`}
              alt="Order"
              className="max-h-64 rounded border cursor-pointer"
              onClick={viewImage}
            />

            <Button variant="outline" size="sm" onClick={viewImage}>
              Open Image
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <Button disabled={loadingStatus} onClick={toggleStatus}>
            {loadingStatus
              ? "Updating..."
              : order.status === "pending"
                ? "Mark Delivered"
                : "Mark Pending"}
          </Button>

          <Button variant="secondary" disabled={printing} onClick={handlePrint}>
            Print
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
