class OrderDetail {
    constructor() {
        this.currentOrder = null;
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
    }

    bindElements() {
        this.detailView = document.getElementById('order-detail-view');
        this.detailContent = document.getElementById('order-detail-content');
        this.printBtn = document.getElementById('btn-print-order');
        this.closeBtn = document.getElementById('btn-close-detail');
    }

    attachEventListeners() {
        this.printBtn.addEventListener('click', () => {
            this.handlePrint();
        });

        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Listen for view order events
        document.addEventListener('viewOrder', (e) => {
            this.show(e.detail);
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.detailView.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    async show(order) {
        this.currentOrder = order;
        await this.renderOrderDetail();
        this.detailView.classList.remove('hidden');
    }

    hide() {
        this.detailView.classList.add('hidden');
        this.currentOrder = null;
    }

    async renderOrderDetail() {
        if (!this.currentOrder) return;

        const order = this.currentOrder;

        this.detailContent.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Order ID</div>
                    <div class="detail-value">#${order.id}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="order-status ${order.status}">${order.status}</span>
                        <button class="btn btn-secondary btn-small" id="toggle-status-btn" style="margin-left: 12px;">
                            ${order.status === 'pending' ? 'Mark Complete' : 'Mark Pending'}
                        </button>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Customer Name</div>
                    <div class="detail-value">${Helpers.sanitizeHtml(order.customer_name)}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">
                        ${Helpers.sanitizeHtml(order.phone_number)}
                        <button class="btn btn-link btn-small" id="copy-phone-btn" style="margin-left: 8px;" title="Copy phone number">
                            📋
                        </button>
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Order Date</div>
                    <div class="detail-value">${Helpers.formatDate(order.order_date)}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Order Time</div>
                    <div class="detail-value">${Helpers.formatTime(order.order_time)}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Day of Week</div>
                    <div class="detail-value">${order.day_of_week}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Created</div>
                    <div class="detail-value">${Helpers.getRelativeTime(order.created_at)}</div>
                </div>

                ${order.order_notes ? `
                    <div class="detail-item detail-notes">
                        <div class="detail-label">Order Notes</div>
                        <div class="detail-value">${Helpers.sanitizeHtml(order.order_notes)}</div>
                    </div>
                ` : ''}

                <div class="detail-item detail-image">
                    <div class="detail-label">Requirements Image</div>
                    <div class="detail-value">
                        ${order.image_path ? `
                            <img src="file://${order.image_path}" alt="Requirements" onclick="this.requestFullscreen()" style="cursor: zoom-in;" title="Click to view fullscreen">
                            <div class="image-actions" style="margin-top: 12px;">
                                <button class="btn btn-secondary btn-small" id="fullscreen-image-btn">View Fullscreen</button>
                                <button class="btn btn-secondary btn-small" id="copy-image-path-btn">Copy Path</button>
                            </div>
                        ` : '<span class="text-muted">No image available</span>'}
                    </div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Barcode</div>
                    <div class="detail-value">
                        <div class="detail-barcode">
                            <div class="barcode-code" id="barcode-code-container">
                                <div id="barcode-code-${order.id}"></div>
                                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                                    Order #${order.id}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Generate barcode
        await this.generateBarcode(order);

        // Attach event listeners for detail actions
        this.attachDetailEventListeners(order);
    }

    async generateBarcode(order) {
        try {
            // Generate barcode value
            const timestamp = new Date(order.created_at).getTime().toString().slice(-6);
            const paddedId = String(order.id).padStart(4, '0');
            const barcodeValue = `ORD${paddedId}${timestamp}`;

            const barcodeContainer = document.getElementById(`barcode-code-${order.id}`);
            if (barcodeContainer && window.JsBarcode) {
                // Clear previous barcode
                barcodeContainer.innerHTML = '';

                // Create canvas for barcode
                const canvas = document.createElement('canvas');
                barcodeContainer.appendChild(canvas);

                // Generate barcode
                window.JsBarcode(canvas, barcodeValue, {
                    format: 'CODE128',
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 10,
                    textAlign: 'center',
                    textPosition: 'bottom',
                    background: '#ffffff',
                    lineColor: '#000000',
                    margin: 5
                });
            } else {
                // Fallback if JsBarcode library is not available
                barcodeContainer.innerHTML = `
                    <div style="width: 200px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background: #f9f9f9; flex-direction: column;">
                        <span style="font-size: 12px; color: #666;">Barcode</span>
                        <span style="font-size: 10px; color: #666; font-family: monospace;">${barcodeValue}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error generating barcode:', error);
            const barcodeContainer = document.getElementById(`barcode-code-${order.id}`);
            if (barcodeContainer) {
                barcodeContainer.innerHTML = '<span class="text-muted">Barcode generation failed</span>';
            }
        }
    }

    attachDetailEventListeners(order) {
        // Toggle status button
        const toggleStatusBtn = document.getElementById('toggle-status-btn');
        if (toggleStatusBtn) {
            toggleStatusBtn.addEventListener('click', async () => {
                await this.handleStatusToggle(order);
            });
        }

        // Copy phone button
        const copyPhoneBtn = document.getElementById('copy-phone-btn');
        if (copyPhoneBtn) {
            copyPhoneBtn.addEventListener('click', () => {
                this.copyPhoneNumber(order.phone_number);
            });
        }

        // Fullscreen image button
        const fullscreenBtn = document.getElementById('fullscreen-image-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.viewImageFullscreen(order.image_path);
            });
        }

        // Copy image path button
        const copyImagePathBtn = document.getElementById('copy-image-path-btn');
        if (copyImagePathBtn) {
            copyImagePathBtn.addEventListener('click', () => {
                this.copyImagePath(order.image_path);
            });
        }
    }

    async handleStatusToggle(order) {
        const newStatus = order.status === 'pending' ? 'completed' : 'pending';
        
        try {
            const result = await Helpers.ipcInvoke('update-order-status', order.id, newStatus);
            
            if (result.success) {
                // Update current order
                this.currentOrder.status = newStatus;
                this.currentOrder.updated_at = new Date().toISOString();

                // Re-render detail
                await this.renderOrderDetail();

                // Dispatch event for other components to update
                const event = new CustomEvent('orderStatusChanged', {
                    detail: { orderId: order.id, newStatus }
                });
                document.dispatchEvent(event);

                notifications.success(`Order marked as ${newStatus}`);
            } else {
                throw new Error(result.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            notifications.error('Failed to update order status');
        }
    }

    async copyPhoneNumber(phoneNumber) {
        try {
            await Helpers.copyToClipboard(phoneNumber);
            notifications.success('Phone number copied to clipboard');
        } catch (error) {
            console.error('Error copying phone number:', error);
            notifications.error('Failed to copy phone number');
        }
    }

    viewImageFullscreen(imagePath) {
        if (!imagePath) return;

        // Create fullscreen overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = `file://${imagePath}`;
        img.style.cssText = `
            max-width: 95%;
            max-height: 95%;
            object-fit: contain;
            border-radius: 8px;
        `;

        overlay.appendChild(img);
        document.body.appendChild(overlay);

        // Close on click or escape
        const closeFullscreen = () => {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
            }
        };

        overlay.addEventListener('click', closeFullscreen);
        document.addEventListener('keydown', handleEscape);
    }

    async copyImagePath(imagePath) {
        if (!imagePath) return;

        try {
            await Helpers.copyToClipboard(imagePath);
            notifications.success('Image path copied to clipboard');
        } catch (error) {
            console.error('Error copying image path:', error);
            notifications.error('Failed to copy image path');
        }
    }

    async handlePrint() {
        if (!this.currentOrder) return;

        try {
            this.printBtn.disabled = true;
            this.printBtn.textContent = 'Printing...';

            const result = await Helpers.ipcInvoke('print-order', this.currentOrder.id);
            
            if (result.success) {
                notifications.success('Print dialog opened');
            } else {
                throw new Error(result.error || 'Failed to print');
            }
        } catch (error) {
            console.error('Error printing order:', error);
            notifications.error('Failed to print order slips');
        } finally {
            this.printBtn.disabled = false;
            this.printBtn.textContent = 'Print Slips';
        }
    }
}

// Add button styles for detail view
const detailStyle = document.createElement('style');
detailStyle.textContent = `
    .btn-small {
        padding: 4px 8px !important;
        font-size: 12px !important;
    }
    
    .btn-link {
        background: none !important;
        color: #667eea !important;
        border: 1px solid transparent !important;
        text-decoration: none;
    }
    
    .btn-link:hover {
        background: rgba(102, 126, 234, 0.1) !important;
        border-color: #667eea !important;
    }
`;
document.head.appendChild(detailStyle);

window.OrderDetail = OrderDetail;