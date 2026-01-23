import { useEffect, useRef, useState } from "react";
import Helpers from "@/utils/helpers";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function OrderDetailModal({ order, onClose, onOrderUpdated }) {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const barcodeRef = useRef(null);

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
          margin: 5,
        });
      } else {
        barcodeRef.current.innerHTML = barcodeValue;
      }
    } catch (err) {
      console.error("Barcode generation failed", err);
    }
  }, [order]);

  if (!order) return null;

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
      onOrderUpdated(result.order);
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

  const viewImageFullscreen = () => {
    if (!order.image_path) return;
    Helpers.ipcInvoke("open-file", order.image_path);
  };

  // --------------------
  // Render
  // --------------------
  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Order #{order.id}
            <Badge variant={order.status === "delivered" ? "" : "primary"}>
              {order.status[0].toUpperCase() + order.status.substring(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Customer</div>
            <div className="font-medium">{order.customer_name}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Phone</div>
            <div>{order.phone_number}</div>
          </div>

          {order.weight && (
            <div>
              <div className="text-muted-foreground">Weight</div>
              <div>{order.weight}</div>
            </div>
          )}

          {order.address && (
            <div>
              <div className="text-muted-foreground">Address</div>
              <div>{order.address}</div>
            </div>
          )}
        </div>

        <Separator />

        {/* Notes */}
        {order.order_notes && (
          <div>
            <div className="text-muted-foreground text-sm mb-1">Notes</div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              {order.order_notes}
            </div>
          </div>
        )}

        {/* Image + Barcode */}
        {order.image_path && (
          <div className="detail-section">
            <div className="image-container">
              <img
                src={`file://${order.image_path}`}
                className="detail-image cursor-pointer rounded-lg"
                onClick={viewImageFullscreen}
                alt="Order requirement"
              />
            </div>

            <button
              className="btn btn-secondary btn-small"
              onClick={viewImageFullscreen}
            >
              View Fullscreen
            </button>

            <div className="detail-barcode" ref={barcodeRef} />
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            disabled={previewing}
            onClick={handlePreviewPdf}
          >
            Preview PDF
          </Button>

          <Button variant="outline" disabled={printing} onClick={handlePrint}>
            Print
          </Button>

          <Button disabled={loadingStatus} onClick={toggleStatus}>
            {loadingStatus
              ? "Updating..."
              : order.status === "pending"
                ? "Mark Delivered"
                : "Mark Pending"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
