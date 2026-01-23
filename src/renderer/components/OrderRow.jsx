import { useState } from "react";
import Helpers from "@/utils/helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "./ui/badge";

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
    } finally {
      setStatusLoading(false);
    }
  };

  const togglePayment = async () => {
    const newStatus = order.payment_status === "pending" ? "done" : "pending";
    try {
      setPaymentLoading(true);
      await onPaymentStatusChange(order.id, newStatus);
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
    <TableRow
      className={`${order.deleted ? "opacity-60" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
    >
      <TableCell className="font-mono">#{order.id}</TableCell>

      <TableCell className="font-medium">{order.customer_name}</TableCell>

      <TableCell className="whitespace-nowrap">{order.phone_number}</TableCell>

      <TableCell className="whitespace-nowrap">
        {Helpers.formatDate(order.order_date)}
      </TableCell>

      <TableCell className="whitespace-nowrap">{order.order_time}</TableCell>

      <TableCell>
        <div className="capitalize">{order.status}</div>
        {order.status === "delivered" && order.delivered_at && (
          <div className="text-xs text-muted-foreground">
            {Helpers.formatDateTimeDisplay(order.delivered_at)}
          </div>
        )}
      </TableCell>

      <TableCell className="capitalize">
        {order.payment_status === "pending" ? (
          <Badge variant="secondary">Pending</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            Done
          </Badge>
        )}
      </TableCell>

      <TableCell>
        {order.image_path ? (
          <button
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => Helpers.ipcInvoke("open-file", order.image_path)}
          >
            View Image
          </button>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-md border hover:bg-muted flex items-center justify-center">
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(order)}>
              View
            </DropdownMenuItem>

            {!order.deleted && (
              <>
                <DropdownMenuItem
                  disabled={statusLoading}
                  onClick={toggleStatus}
                >
                  {order.status === "pending"
                    ? "Mark Delivered"
                    : "Mark Pending"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  disabled={paymentLoading}
                  onClick={togglePayment}
                >
                  {order.payment_status === "pending"
                    ? "Mark Payment Done"
                    : "Mark Payment Pending"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-destructive"
                  disabled={deleteLoading}
                  onClick={handleDelete}
                >
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
