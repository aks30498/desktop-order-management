import { useState } from "react";

export default function OrderRow({
  order,
  onView,
  onDelete,
  onStatusChange,
  onPaymentStatusChange,
}) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const toggleStatus = async () => {
    const newStatus = order.status === "pending" ? "delivered" : "pending";

    try {
      setStatusLoading(true);
      await onStatusChange(order.id, newStatus);
    } catch {
      notifications.error("Failed to update order status");
    } finally {
      setStatusLoading(false);
    }
  };

  const togglePayment = async () => {
    const newStatus =
      order.payment_status === "pending" ? "done" : "pending";

    try {
      setPaymentLoading(true);
      await onPaymentStatusChange(order.id, newStatus);
    } catch {
      notifications.error("Failed to update payment status");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      await onDelete(order.id);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <tr
      className={`order-row${order.deleted ? " order-row-deleted" : ""}`}
    >
      <td className="order-id">#{order.id}</td>

      <td className="order-customer">
        {order.customer_name}
      </td>

      <td className="order-phone">
        {order.phone_number}
      </td>

      <td className="order-date">
        {Helpers.formatDate(order.order_date)}
      </td>

      <td className="order-time">{order.order_time}</td>

      <td className={`order-status ${order.status}`}>
        <div className="status-label">{order.status}</div>

        {order.status === "delivered" && order.delivered_at && (
          <div className="status-meta">
            {Helpers.formatDateTimeDisplay(order.delivered_at)}
          </div>
        )}

        {order.deleted && order.deleted_at && (
          <div className="status-meta">
            Deleted {Helpers.formatDateTimeDisplay(order.deleted_at)}
          </div>
        )}
      </td>

      <td className={`order-payment-status ${order.payment_status}`}>
        {order.payment_status}
      </td>

      <td className="image-cell">
        {order.image_path ? (
          <button
            className="btn-link"
            onClick={() => window.open(order.image_path, "_blank")}
          >
            View Image
          </button>
        ) : (
          "-"
        )}
      </td>

      <td className="table-actions">
        <div className="table-actions-container">
          <button className="btn-link" onClick={() => onView(order)}>
            View
          </button>

          {!order.deleted && (
            <>
              <button
                className="btn-link"
                disabled={statusLoading}
                onClick={toggleStatus}
              >
                {statusLoading
                  ? "Updating..."
                  : order.status === "pending"
                  ? "Mark Delivered"
                  : "Mark Pending"}
              </button>

              <button
                className="btn-link"
                disabled={paymentLoading}
                onClick={togglePayment}
              >
                {paymentLoading
                  ? "Updating..."
                  : order.payment_status === "pending"
                  ? "Mark Payment Done"
                  : "Mark Payment Pending"}
              </button>

              <button
                className="btn-link"
                disabled={deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
