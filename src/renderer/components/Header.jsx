import { Button } from "@/components/ui/button";

export default function Header({ onNewOrder, onScanBarcode, onHome }) {
  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        <h1
          className="cursor-pointer text-lg font-semibold tracking-tight"
          onClick={onHome}
        >
          Desktop Order Management
        </h1>

        <div className="flex items-center gap-2">
          <Button onClick={onNewOrder}>New Order</Button>

          <Button variant="secondary" onClick={onScanBarcode}>
            Scan Barcode
          </Button>
        </div>
      </div>
    </header>
  );
}
