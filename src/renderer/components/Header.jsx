export default function Header({ onNewOrder, onScanBarcode, onHome }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1
          className="app-title"
          style={{ cursor: "pointer" }}
          onClick={onHome}
        >
          Desktop Order Management
        </h1>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={onNewOrder}>
            <span className="icon">add</span>
            New Order
          </button>

          <button className="btn btn-secondary" onClick={onScanBarcode}>
            <span className="icon">qr_code_scanner</span>
            Scan Barcode
          </button>
        </div>
      </div>
    </header>
  );
}
