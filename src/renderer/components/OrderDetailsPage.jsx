import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Helpers from "@/utils/helpers";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const barcodeRef = useRef(null);

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
      notifications.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  // --------------------
  // Generate barcode
  // --------------------
  useEffect(() => {
    if (!order?.image_path) return;
    if (!barcodeRef.current) return;

    try {
      const timestamp = new Date(order.created_at)
        .getTime()
        .toString()
        .slice(-6);
      const paddedId = String(order.id).padStart(4, "0");
      const barcodeValue = `ORD${paddedId}${timestamp}`;

      barcodeRef.current.innerHTML = "";

      if (window.JsBarcode) {
        const canvas = document.createElement("canvas");
        barcodeRef.current.appendChild(canvas);

        window.JsBarcode(canvas, barcodeValue, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 10,
          textPosition: "bottom",
          margin: 5,
        });
      } else {
        barcodeRef.current.innerHTML = `
          <div style="padding:8px;border:1px solid #ccc;font-size:12px">
            ${barcodeValue}
          </div>
        `;
      }
    } catch (err) {
      console.error("Barcode generation failed", err);
    }
  }, [order]);

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

      if (!result.success) throw new Error(result.error);

      notifications.success(`Order marked as ${newStatus}`);
      setOrder(result.order);
    } catch (err) {
      console.error(err);
      notifications.error("Failed to update order status");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const result = await Helpers.ipcInvoke("print-order", order.id);
      if (!result.success) throw new Error(result.error);
      notifications.success("Print dialog opened");
    } catch {
      notifications.error("Failed to print order");
    } finally {
      setPrinting(false);
    }
  };

  const handlePreviewPdf = async () => {
    try {
      setPreviewing(true);
      const result = await Helpers.ipcInvoke("preview-order-pdf", order.id);
      if (!result.success) throw new Error(result.error);
      notifications.success("PDF preview opened");
    } catch {
      notifications.error("Failed to generate PDF preview");
    } finally {
      setPreviewing(false);
    }
  };

  const viewImage = () => {
    if (!order.image_path) return;

    // Electron safe open
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
              variant={order.status === "delivered" ? "success" : "secondary"}
            >
              {order.status}
            </Badge>

            <Badge
              variant={order.payment_status === "done" ? "success" : "outline"}
            >
              {order.payment_status}
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
          <CardTitle>Customer</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Name</div>
            <div>{order.customer_name}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Phone</div>
            <div>{order.contact}</div>
          </div>

          {order.address && (
            <div className="col-span-2">
              <div className="text-muted-foreground">Address</div>
              <div>{order.address}</div>
            </div>
          )}

          {order.weight && (
            <div>
              <div className="text-muted-foreground">Weight</div>
              <div>{order.weight}</div>
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

      {/* Image + Barcode */}
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

            <div ref={barcodeRef} />

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

          <Button
            variant="secondary"
            disabled={previewing}
            onClick={handlePreviewPdf}
          >
            Preview PDF
          </Button>

          <Button variant="secondary" disabled={printing} onClick={handlePrint}>
            Print
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
