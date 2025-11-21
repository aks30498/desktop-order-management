class MainView {
    constructor() {
        this.currentView = 'orders';
        this.ordersView = null;
        this.orderForm = null;
        this.orderDetail = null;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.initializeComponents();
        this.showOrdersView();
    }

    bindElements() {
        this.ordersView = document.getElementById('orders-view');
        this.orderFormView = document.getElementById('order-form-view');
        this.orderDetailView = document.getElementById('order-detail-view');
        
        this.newOrderBtn = document.getElementById('btn-new-order');
        this.sidebarNewOrderBtn = document.getElementById('btn-sidebar-new-order');
        this.closeFormBtn = document.getElementById('btn-close-form');
        this.scanBarcodeBtn = document.getElementById('btn-scan-barcode');
        this.barcodeModal = document.getElementById('barcode-scanner-modal');
        this.barcodeInput = document.getElementById('barcode-scanner-input');
        this.barcodeResult = document.getElementById('barcode-scan-result');
        this.barcodeScanActionBtn = document.getElementById('btn-barcode-scan-action');
        this.barcodeCancelBtn = document.getElementById('btn-cancel-barcode-scan');
        this.closeBarcodeModalBtn = document.getElementById('btn-close-barcode-modal');
        
        // Debug: Check if elements exist
        console.log('MainView elements check:', {
            ordersView: !!this.ordersView,
            orderFormView: !!this.orderFormView,
            orderDetailView: !!this.orderDetailView,
            newOrderBtn: !!this.newOrderBtn,
            sidebarNewOrderBtn: !!this.sidebarNewOrderBtn,
            closeFormBtn: !!this.closeFormBtn,
            scanBarcodeBtn: !!this.scanBarcodeBtn,
            barcodeModal: !!this.barcodeModal
        });
        
        if (!this.newOrderBtn) {
            console.error('New Order button not found in DOM');
        }
        if (!this.sidebarNewOrderBtn) {
            console.error('Sidebar New Order button not found in DOM');
        }
        if (!this.orderFormView) {
            console.error('Order Form View not found in DOM');
        }
    }

    attachEventListeners() {
        // New order buttons
        this.newOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Header New Order button clicked');
            this.showOrderForm();
        });

        this.sidebarNewOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Sidebar New Order button clicked');
            this.showOrderForm();
        });

        if (this.scanBarcodeBtn) {
            this.scanBarcodeBtn.addEventListener('click', () => {
                this.openBarcodeScanner();
            });
        }

        if (this.barcodeScanActionBtn) {
            this.barcodeScanActionBtn.addEventListener('click', () => {
                this.handleBarcodeScan();
            });
        }

        if (this.barcodeCancelBtn) {
            this.barcodeCancelBtn.addEventListener('click', () => {
                this.closeBarcodeScanner();
            });
        }

        if (this.closeBarcodeModalBtn) {
            this.closeBarcodeModalBtn.addEventListener('click', () => {
                this.closeBarcodeScanner();
            });
        }

        if (this.barcodeModal) {
            this.barcodeModal.addEventListener('click', (event) => {
                if (event.target === this.barcodeModal || event.target.classList.contains('barcode-scanner-backdrop')) {
                    this.closeBarcodeScanner();
                }
            });
        }

        if (this.barcodeInput) {
            this.barcodeInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleBarcodeScan();
                }
            });
        }

        // Close form button
        this.closeFormBtn.addEventListener('click', () => {
            this.showOrdersView();
        });

        // Custom events
        document.addEventListener('closeOrderForm', () => {
            this.showOrdersView();
        });

        document.addEventListener('closeOrderDetail', () => {
            this.showOrdersView();
        });

        document.addEventListener('orderAdded', (e) => {
            this.handleOrderAdded(e.detail);
        });

        document.addEventListener('viewOrder', (e) => {
            this.showOrderDetail(e.detail);
        });

        document.addEventListener('orderStatusChanged', (e) => {
            this.handleOrderStatusChanged(e.detail);
        });

        // Menu events from main process
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('menu-new-order', () => {
            this.showOrderForm();
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    initializeComponents() {
        // Initialize view components
        this.ordersViewComponent = new OrdersView();
        this.orderFormComponent = new OrderForm();
        this.orderDetailComponent = new OrderDetail();
    }

    showOrdersView() {
        this.hideAllViews();
        this.ordersView.classList.remove('hidden');
        this.currentView = 'orders';
        
        // Update header title context
        this.updateHeaderContext('Orders');
    }

    showOrderForm() {
        console.log('MainView: showOrderForm() called');
        this.hideAllViews();
        this.orderFormView.classList.remove('hidden');
        this.currentView = 'form';
        
        // Ensure form component exists and show it
        if (this.orderFormComponent) {
            this.orderFormComponent.show();
        } else {
            console.error('OrderForm component not initialized');
        }
        
        // Update header title context
        this.updateHeaderContext('Add New Order');
        console.log('MainView: Switched to form view');
    }

    showOrderDetail(order) {
        this.hideAllViews();
        this.orderDetailView.classList.remove('hidden');
        this.currentView = 'detail';
        this.orderDetailComponent.show(order);
        
        // Update header title context
        this.updateHeaderContext(`Order #${order.id}`);
    }

    hideAllViews() {
        this.ordersView.classList.add('hidden');
        this.orderFormView.classList.add('hidden');
        this.orderDetailView.classList.add('hidden');
    }

    openBarcodeScanner() {
        if (!this.barcodeModal) {
            console.warn('Barcode scanner modal not available');
            return;
        }

        this.barcodeModal.classList.remove('hidden');
        this.clearBarcodeScanResult();

        if (this.barcodeInput) {
            this.barcodeInput.value = '';
            setTimeout(() => this.barcodeInput.focus(), 50);
        }
    }

    closeBarcodeScanner() {
        if (!this.barcodeModal) return;
        this.barcodeModal.classList.add('hidden');
        this.clearBarcodeScanResult();
    }

    isBarcodeScannerOpen() {
        return this.barcodeModal && !this.barcodeModal.classList.contains('hidden');
    }

    clearBarcodeScanResult() {
        if (!this.barcodeResult) return;
        this.barcodeResult.classList.add('hidden');
        this.barcodeResult.classList.remove('success', 'error');
        this.barcodeResult.textContent = '';
    }

    showBarcodeScanResult(message, type = 'info') {
        if (!this.barcodeResult) return;
        this.barcodeResult.textContent = message;
        this.barcodeResult.classList.remove('hidden', 'success', 'error');

        if (type === 'success') {
            this.barcodeResult.classList.add('success');
        } else if (type === 'error') {
            this.barcodeResult.classList.add('error');
        }
    }

    parseBarcodeValue(barcodeString) {
        if (!barcodeString) {
            return null;
        }

        const normalized = barcodeString.trim();

        // Match local image server URLs: http://localhost:PORT/order-image/ID
        const imageUrlMatch = normalized.match(/^http:\/\/localhost:(\d+)\/order-image\/(\d+)$/i);
        if (imageUrlMatch) {
            return {
                type: 'image_url',
                port: parseInt(imageUrlMatch[1], 10),
                orderId: parseInt(imageUrlMatch[2], 10),
                barcodeValue: normalized
            };
        }

        // Match file path references (legacy)
        if (normalized.startsWith('file://')) {
            const filePath = normalized.substring(7);
            return {
                type: 'image_path',
                filePath,
                barcodeValue: normalized
            };
        }

        // Match classic order barcode ORD####
        const orderMatch = normalized.match(/^ORD(\d{4})(\d{6})$/i);
        if (orderMatch) {
            return {
                type: 'order',
                orderId: parseInt(orderMatch[1], 10),
                timestamp: orderMatch[2],
                barcodeValue: normalized
            };
        }

        return null;
    }

    async handleBarcodeScan() {
        if (!this.barcodeInput) return;

        const rawValue = this.barcodeInput.value.trim();
        if (!rawValue) {
            this.showBarcodeScanResult('Please scan or enter a barcode value.', 'error');
            return;
        }

        const parsedData = this.parseBarcodeValue(rawValue);
        if (!parsedData) {
            this.showBarcodeScanResult('Invalid barcode. Please scan a valid slip barcode.', 'error');
            return;
        }

        const orderId = parsedData && (parsedData.type === 'image_url' || parsedData.type === 'order')
            ? parsedData.orderId
            : null;

        if (!orderId) {
            this.showBarcodeScanResult('Barcode does not map to a known order.', 'error');
            return;
        }

        this.showBarcodeScanResult(`Searching for order #${orderId}...`);

        try {
            const response = await Helpers.ipcInvoke('get-order-by-id', orderId);
            if (!response.success || !response.order) {
                throw new Error(response.error || `Order #${orderId} not found.`);
            }

            this.showBarcodeScanResult(`Opening order #${orderId}`, 'success');
            notifications.success(`Order #${orderId} loaded from barcode`);
            this.showOrderDetail(response.order);
            this.closeBarcodeScanner();
        } catch (error) {
            console.error('Failed to open order from barcode:', error);
            this.showBarcodeScanResult(error.message || 'Unable to load order details.', 'error');
        }
    }

    updateHeaderContext(context) {
        // This could be expanded to show breadcrumbs or current context
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            statusIndicator.textContent = context;
        }
    }

    handleOrderAdded(order) {
        // Switch back to orders view
        this.showOrdersView();
        
        // Just refresh the entire view instead of trying to add the order manually
        if (this.ordersViewComponent) {
            try {
                this.ordersViewComponent.refresh();
            } catch (error) {
                console.error('Error refreshing orders view:', error);
            }
        }        
    }

    handleOrderStatusChanged(data) {
        // Refresh orders view if we're currently viewing orders
        if (this.currentView === 'orders' && this.ordersViewComponent) {
            this.ordersViewComponent.refresh();
        }
    }

    handleKeyboardShortcuts(e) {
        if (this.isBarcodeScannerOpen()) {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeBarcodeScanner();
                return;
            }
            if (e.key === 'Enter' && document.activeElement === this.barcodeInput) {
                e.preventDefault();
                this.handleBarcodeScan();
                return;
            }
        }

        // Ctrl/Cmd + N - New Order
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showOrderForm();
            return;
        }

        // Ctrl/Cmd + R - Refresh (if in orders view)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && this.currentView === 'orders') {
            e.preventDefault();
            if (this.ordersViewComponent) {
                this.ordersViewComponent.refresh();
            }
            return;
        }

        // Escape - Close current view/form
        if (e.key === 'Escape') {
            if (this.currentView === 'form') {
                this.showOrdersView();
            } else if (this.currentView === 'detail') {
                this.showOrdersView();
            }
        }

        // Number keys for tab switching (when in orders view)
        if (this.currentView === 'orders' && (e.ctrlKey || e.metaKey)) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.switchOrderTab('all');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchOrderTab('today');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchOrderTab('week');
                    break;
                case '4':
                    e.preventDefault();
                    this.switchOrderTab('delivered');
                    break;
                case '5':
                    e.preventDefault();
                    this.switchOrderTab('pending');
                    break;
                case '6':
                    e.preventDefault();
                    this.switchOrderTab('deleted');
                    break;
            }
        }
    }

    switchOrderTab(tabName) {
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }

    async refreshCurrentView() {
        switch (this.currentView) {
            case 'orders':
                if (this.ordersViewComponent) {
                    await this.ordersViewComponent.refresh();
                }
                break;
            case 'detail':
                // Refresh order detail if needed
                if (this.orderDetailComponent && this.orderDetailComponent.currentOrder) {
                    const orderId = this.orderDetailComponent.currentOrder.id;
                    try {
                        const result = await Helpers.ipcInvoke('get-order-by-id', orderId);
                        if (result.success && result.order) {
                            this.orderDetailComponent.show(result.order);
                        }
                    } catch (error) {
                        console.error('Error refreshing order detail:', error);
                    }
                }
                break;
        }
    }

    // Public methods for external access
    getCurrentView() {
        return this.currentView;
    }

    getOrdersView() {
        return this.ordersViewComponent;
    }

    getOrderForm() {
        return this.orderFormComponent;
    }

    getOrderDetail() {
        return this.orderDetailComponent;
    }

    cleanup() {
        // Cleanup method for when the window closes
        console.log('Cleaning up main view...');
        
        // Remove event listeners if needed
        // Cancel any pending operations
        // Save any draft data if applicable
    }

    // Error handling
    handleError(error, context = 'Application') {
        console.error(`${context} Error:`, error);
        notifications.error(`${context} error: ${error.message}`);
    }

    // Status updates
    updateConnectionStatus(isConnected) {
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator) {
            if (isConnected) {
                statusIndicator.textContent = 'Connected';
                statusIndicator.className = 'status-indicator connected';
            } else {
                statusIndicator.textContent = 'Disconnected';
                statusIndicator.className = 'status-indicator disconnected';
            }
        }
    }

    // Application state
    getApplicationState() {
        return {
            currentView: this.currentView,
            hasUnsavedChanges: this.orderFormComponent ? this.orderFormComponent.hasFormData() : false,
            currentOrder: this.orderDetailComponent ? this.orderDetailComponent.currentOrder : null
        };
    }
}

// Add status indicator styles
const statusStyle = document.createElement('style');
statusStyle.textContent = `
    .status-indicator.connected::before {
        background-color: #10b981;
    }
    
    .status-indicator.disconnected::before {
        background-color: #ef4444;
    }
`;
document.head.appendChild(statusStyle);

window.MainView = MainView;