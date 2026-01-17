import { useEffect, useRef, useState } from "react";

export default function OrderDetailModal({
  order,
  onClose,
  onOrderUpdated,
}) {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const barcodeRef = useRef(null);

  // --------------------
  // ESC to close
  // --------------------
  useEffect(() => {
    if (!order) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [order, onClose]);

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

  if (!order) return null;

  // --------------------
  // Actions
  // --------------------
  const toggleStatus = async () => {
    try {
      setLoadingStatus(true);
      const newStatus =
        order.status === "pending" ? "delivered" : "pending";

      const result = await Helpers.ipcInvoke(
        "update-order-status",
        order.id,
        newStatus
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
      const result = await Helpers.ipcInvoke(
        "preview-order-pdf",
        order.id
      );
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
    window.open(`file://${order.image_path}`, "_blank");
  };

  // --------------------
  // Render
  // --------------------
  return (
    <div className="order-detail-overlay">
      <div className="order-detail-modal">
        <div className="detail-summary">
          <div>
            <h2>Order #{order.id}</h2>
            {order.status === "delivered" && order.delivered_at && (
              <div className="detail-chip delivered">
                Delivered{" "}
                {Helpers.formatDateTimeDisplay(order.delivered_at)}
              </div>
            )}
          </div>

          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Customer */}
        <div className="customer-info">
          <div>Customer: {order.customer_name}</div>
          <div>Phone: {order.phone_number}</div>
          {order.weight && <div>Weight: {order.weight}</div>}
          {order.address && <div>Address: {order.address}</div>}
        </div>

        {/* Notes */}
        {order.order_notes && (
          <div className="detail-section">
            <div className="detail-label">Notes</div>
            <div className="detail-value">{order.order_notes}</div>
          </div>
        )}

        {/* Image + Barcode */}
        {order.image_path && (
          <div className="detail-section">
            <div className="image-container">
              <img
                src={`file://${order.image_path}`}
                className="detail-image"
                onClick={viewImageFullscreen}
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

        {/* Actions */}
        <div className="detail-actions">
          <button
            className="btn btn-primary"
            disabled={loadingStatus}
            onClick={toggleStatus}
          >
            {loadingStatus
              ? "Updating..."
              : order.status === "pending"
              ? "Mark Delivered"
              : "Mark Pending"}
          </button>

          <button
            className="btn btn-secondary"
            disabled={previewing}
            onClick={handlePreviewPdf}
          >
            Preview PDF
          </button>

          <button
            className="btn btn-secondary"
            disabled={printing}
            onClick={handlePrint}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
