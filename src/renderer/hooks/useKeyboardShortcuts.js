import { useEffect } from "react";

export function useKeyboardShortcuts({
  activeView,
  openForm,
  closeView,
  refreshOrders,
  openBarcode,
  closeBarcode,
}) {
  useEffect(() => {
    const handler = (e) => {
      // Barcode modal
      if (e.key === "Escape") closeBarcode?.();

      // Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        openForm();
      }

      // Ctrl/Cmd + R
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "r" &&
        activeView === "orders"
      ) {
        e.preventDefault();
        refreshOrders?.();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeView]);
}
