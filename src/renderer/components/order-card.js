class OrderCard {
    constructor(order, onEdit, onStatusChange, onView) {
        this.order = order;
        this.onEdit = onEdit;
        this.onStatusChange = onStatusChange;
        this.onView = onView;
    }

    render() {
        const row = document.createElement('tr');
        row.className = 'order-row';
        row.dataset.orderId = this.order.id;

        row.innerHTML = `
            <td class="order-id">#${this.order.id}</td>
            <td class="order-customer">${Helpers.sanitizeHtml(this.order.customer_name)}</td>
            <td class="order-phone">${Helpers.sanitizeHtml(this.order.phone_number)}</td>
            <td class="order-date">${Helpers.formatDate(this.order.order_date)}</td>
            <td class="order-time">${Helpers.formatTime(this.order.order_time)}</td>
            <td class="order-status ${this.order.status}">${this.order.status}</td>
            <td class="image-cell">
                ${this.order.image_path ? 
                    `<button class="btn-link btn-view-image" data-action="view-image">View Image</button>` : 
                    '-'
                }
            </td>
            <td class="table-actions">
                <div class="table-actions">
                    <button class="btn-link btn-view" data-action="view">View</button>
                    <button class="btn-link btn-status" data-action="status">
                        ${this.order.status === 'pending' ? 'Mark Complete' : 'Mark Pending'}
                    </button>
                </div>
            </td>
        `;

        this.attachEventListeners(row);
        return row;
    }

    attachEventListeners(card) {
        const viewBtn = card.querySelector('.btn-view');
        const statusBtn = card.querySelector('.btn-status');
        const viewImageBtn = card.querySelector('.btn-view-image');

        // View details
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onView) {
                this.onView(this.order);
            }
        });

        // View image
        if (viewImageBtn) {
            viewImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.order.image_path) {
                    // Open image in a new window or modal
                    window.open(this.order.image_path, '_blank');
                }
            });
        }

        // Toggle status
        statusBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newStatus = this.order.status === 'pending' ? 'completed' : 'pending';
            
            try {
                statusBtn.disabled = true;
                statusBtn.textContent = 'Updating...';
                
                if (this.onStatusChange) {
                    await this.onStatusChange(this.order.id, newStatus);
                }
            } catch (error) {
                console.error('Failed to update status:', error);
                notifications.error('Failed to update order status');
            } finally {
                statusBtn.disabled = false;
                statusBtn.textContent = newStatus === 'pending' ? 'Mark Complete' : 'Mark Pending';
            }
        });

        // Remove row click handler - only explicit View button should trigger view
    }

    update(order) {
        this.order = order;
        
        // Update status
        const statusElement = document.querySelector(`[data-order-id="${order.id}"] .order-status`);
        if (statusElement) {
            statusElement.className = `order-status ${order.status}`;
            statusElement.textContent = order.status;
        }

        // Update status button
        const statusBtn = document.querySelector(`[data-order-id="${order.id}"] .btn-status`);
        if (statusBtn) {
            statusBtn.textContent = order.status === 'pending' ? 'Mark Complete' : 'Mark Pending';
        }
    }

    static createPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.className = 'order-card placeholder';
        placeholder.innerHTML = `
            <div class="order-card-header">
                <div class="placeholder-line short"></div>
                <div class="placeholder-line shortest"></div>
            </div>
            <div class="placeholder-line medium"></div>
            <div class="placeholder-line long"></div>
            <div class="placeholder-line medium"></div>
            <div class="placeholder-line short"></div>
        `;
        return placeholder;
    }

    static createList(orders, handlers = {}) {
        const container = document.createElement('div');
        container.className = 'orders-container';

        if (orders.length === 0) {
            const noOrders = document.createElement('div');
            noOrders.className = 'no-orders';
            noOrders.innerHTML = `
                <div class="no-orders-icon">📋</div>
                <h3>No orders found</h3>
                <p>Start by adding your first order using the "New Order" button.</p>
            `;
            container.appendChild(noOrders);
            return container;
        }

        orders.forEach(order => {
            const card = new OrderCard(
                order,
                handlers.onEdit,
                handlers.onStatusChange,
                handlers.onView
            );
            container.appendChild(card.render());
        });

        return container;
    }
}

// Add placeholder animation styles
const placeholderStyle = document.createElement('style');
placeholderStyle.textContent = `
    .order-card.placeholder {
        pointer-events: none;
        opacity: 0.7;
    }
    
    .placeholder-line {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        height: 14px;
        margin: 6px 0;
    }
    
    .placeholder-line.short { width: 30%; }
    .placeholder-line.medium { width: 60%; }
    .placeholder-line.long { width: 80%; }
    .placeholder-line.shortest { width: 20%; }
    
    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
`;
document.head.appendChild(placeholderStyle);

window.OrderCard = OrderCard;