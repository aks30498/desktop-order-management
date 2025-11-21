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
        
        // Dispatch event to return to orders view
        const event = new CustomEvent('closeOrderDetail');
        document.dispatchEvent(event);
    }

    async renderOrderDetail() {
        if (!this.currentOrder) return;

        const order = this.currentOrder;

        this.detailContent.innerHTML = `
        <div class="order-detail">

            <!-- Top summary -->
            <div class="detail-summary">
                <div class="summary-left">
                    <h2>Order #${order.id}</h2>
                    ${order.status === 'delivered' && order.delivered_at ? `
                        <div class="detail-chip delivered">
                            Delivered ${Helpers.formatDateTimeDisplay(order.delivered_at)}
                        </div>
                    ` : ''}
                </div>
                <div class="summary-right">
                    <span>${Helpers.formatDate(order.order_date)} • 
                        ${Helpers.formatTime(order.order_time)} • 
                        ${Helpers.getDayOfWeek(order.order_date)}
                    </span>
                </div>
            </div>

            <!-- Customer Info -->
            <div class="customer-info">
                <div class="customer-item">
                    <span class="customer-label">Customer:</span>
                    <span class="customer-name">${Helpers.sanitizeHtml(order.customer_name)}</span>
                </div>
                <div class="customer-item">
                    <span class="customer-label">Phone:</span>
                    <span class="customer-phone">${Helpers.sanitizeHtml(order.phone_number)}</span>
                </div>
                ${order.weight ? `
                    <div class="customer-item">
                        <span class="customer-label">Weight:</span>
                        <span class="customer-weight">${Helpers.sanitizeHtml(order.weight)}</span>
                    </div>
                ` : ''}
                ${order.address ? `
                    <div class="customer-item">
                        <span class="customer-label">Address:</span>
                        <span class="customer-address">${Helpers.sanitizeHtml(order.address)}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Notes -->
            ${order.order_notes ? `
                <div class="detail-section">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${Helpers.sanitizeHtml(order.order_notes)}</div>
                </div>
            ` : ''}

            <!-- Image + Barcode (only if image exists) -->
            ${order.image_path ? `
                <div class="detail-section">
                    <div class="detail-label">Requirements</div>
                    <div class="detail-value">
                        <div class="image-container">
                            <img src="file://${order.image_path}" alt="Requirements"
                                class="detail-image"
                                id="detail-image-${order.id}">
                        </div>

                        <div class="image-actions">
                            <button class="btn btn-secondary btn-small" id="fullscreen-image-btn">View Fullscreen</button>
                        </div>

                        <!-- Barcode only if image is uploaded -->
                        <div class="detail-barcode">
                            <div id="barcode-code-${order.id}"></div>
                            <div class="barcode-caption">
                                Order #${order.id} - Scan for quick identification
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}


            <!-- Actions -->
            <div class="detail-actions">
                <button class="btn btn-primary" id="toggle-status-btn">
                    ${order.status === 'pending' ? 'Mark as Delivered' : 'Mark as Pending'}
                </button>
                <button class="btn btn-secondary" id="preview-pdf-btn">
                    <span class="icon">picture_as_pdf</span>
                    Preview PDF
                </button>
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
            // Remove any existing listeners by cloning the element
            const newBtn = toggleStatusBtn.cloneNode(true);
            toggleStatusBtn.parentNode.replaceChild(newBtn, toggleStatusBtn);
            
            // Add fresh listener to the new element
            newBtn.addEventListener('click', async () => {
                await this.handleStatusToggle(order);
            });
        }

        // Copy phone button
        const copyPhoneBtn = document.getElementById('copy-phone-btn');
        if (copyPhoneBtn) {
            // Remove any existing listeners by cloning the element
            const newCopyBtn = copyPhoneBtn.cloneNode(true);
            copyPhoneBtn.parentNode.replaceChild(newCopyBtn, copyPhoneBtn);
            
            newCopyBtn.addEventListener('click', () => {
                this.copyPhoneNumber(order.phone_number);
            });
        }

        // Fullscreen image button
        const fullscreenBtn = document.getElementById('fullscreen-image-btn');
        if (fullscreenBtn) {
            // Remove any existing listeners by cloning the element
            const newFullscreenBtn = fullscreenBtn.cloneNode(true);
            fullscreenBtn.parentNode.replaceChild(newFullscreenBtn, fullscreenBtn);
            
            newFullscreenBtn.addEventListener('click', () => {
                this.viewImageFullscreen(order.image_path);
            });
        }

        // Image click to open fullscreen
        const detailImage = document.getElementById(`detail-image-${order.id}`);
        if (detailImage) {
            // Remove any existing listeners by cloning the element
            const newImage = detailImage.cloneNode(true);
            detailImage.parentNode.replaceChild(newImage, detailImage);
            
            newImage.addEventListener('click', () => {
                this.viewImageFullscreen(order.image_path);
            });
            
            // Add cursor pointer style
            newImage.style.cursor = 'pointer';
        }

        // Preview PDF button
        const previewPdfBtn = document.getElementById('preview-pdf-btn');
        if (previewPdfBtn) {
            // Remove any existing listeners by cloning the element
            const newPreviewBtn = previewPdfBtn.cloneNode(true);
            previewPdfBtn.parentNode.replaceChild(newPreviewBtn, previewPdfBtn);
            
            newPreviewBtn.addEventListener('click', async () => {
                await this.handlePreviewPDF(order);
            });
        }
    }

    async handleStatusToggle(order) {
        const newStatus = order.status === 'pending' ? 'delivered' : 'pending';
        
        try {
            const result = await Helpers.ipcInvoke('update-order-status', order.id, newStatus);
            
            if (result.success) {
                this.currentOrder = result.order;

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
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            color: #333;
            font-size: 30px;
            font-weight: bold;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            transition: background 0.2s ease;
        `;

        const img = document.createElement('img');
        img.src = `file://${imagePath}`;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 8px;
            cursor: default;
        `;

        overlay.appendChild(img);
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);

        // Close functionality
        const closeFullscreen = () => {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', handleEscape);
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
            }
        };

        // Close on button click, overlay click (but not image), or escape key
        closeBtn.addEventListener('click', closeFullscreen);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeFullscreen();
        });
        document.addEventListener('keydown', handleEscape);

        // Hover effect for close button
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 1)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.9)';
        });
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

    async handlePreviewPDF(order) {
        const previewBtn = document.getElementById('preview-pdf-btn');
        if (!previewBtn) return;

        try {
            previewBtn.disabled = true;
            previewBtn.innerHTML = '<span class="icon">hourglass_empty</span>Generating...';

            const result = await Helpers.ipcInvoke('preview-order-pdf', order.id);
            
            if (result.success) {
                notifications.success('PDF preview opened');
            } else {
                throw new Error(result.error || 'Failed to generate PDF');
            }
        } catch (error) {
            console.error('Error generating PDF preview:', error);
            notifications.error('Failed to generate PDF preview');
        } finally {
            previewBtn.disabled = false;
            previewBtn.innerHTML = '<span class="icon">picture_as_pdf</span>Preview PDF';
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