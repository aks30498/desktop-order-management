import { useState } from "react";

export default function BarcodeModal({ open, onClose, onOrderFound }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);

  if (!open) return null;

  const parseBarcodeValue = (raw) => {
    const normalized = raw.trim();

    const orderMatch = normalized.match(/^ORD(\d{4})(\d{6})$/i);
    if (orderMatch) {
      return { orderId: parseInt(orderMatch[1], 10) };
    }

    return null;
  };

  const handleScan = async () => {
    const parsed = parseBarcodeValue(value);
    if (!parsed) {
      setResult({ type: "error", text: "Invalid barcode" });
      return;
    }

    try {
      const response = await window.Helpers.ipcInvoke(
        "get-order-by-id",
        parsed.orderId
      );

      if (!response.success) throw new Error("Order not found");

      onOrderFound(response.order);
      onClose();
    } catch (err) {
      setResult({ type: "error", text: err.message });
    }
  };

  return (
    <div className="barcode-scanner-modal">
      <div className="barcode-scanner-backdrop" onClick={onClose} />

      <div className="barcode-scanner-panel">
        <h2>Scan Order Barcode</h2>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
        />

        {result && <div className={result.type}>{result.text}</div>}

        <div>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleScan}>Scan</button>
        </div>
      </div>
    </div>
  );
}
