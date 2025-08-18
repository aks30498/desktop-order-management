class OrderCard {
    constructor(order, onEdit, onStatusChange, onView) {
        this.order = order;
        this.onEdit = onEdit;
        this.onStatusChange = onStatusChange;
        this.onView = onView;
    }

    render() {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.dataset.orderId = this.order.id;

        card.innerHTML = `
            <div class="order-card-header">
                <span class="order-id">Order #${this.order.id}</span>
                <span class="order-status ${this.order.status}">${this.order.status}</span>
            </div>
            
            <div class="order-customer">${Helpers.sanitizeHtml(this.order.customer_name)}</div>
            <div class="order-phone">${Helpers.sanitizeHtml(this.order.phone_number)}</div>
            
            <div class="order-date-time">
                <span>${Helpers.formatDate(this.order.order_date)}</span>
                <span>${Helpers.formatTime(this.order.order_time)}</span>
            </div>
            
            <div class="order-day">${this.order.day_of_week}</div>
            
            ${this.order.order_notes ? `
                <div class="order-notes">
                    ${Helpers.sanitizeHtml(this.order.order_notes)}
                </div>
            ` : ''}
            
            <div class="order-actions">
                <button class="btn btn-primary btn-view" data-action="view">
                    View Details
                </button>
                <button class="btn btn-secondary btn-status" data-action="status">
                    ${this.order.status === 'pending' ? 'Mark Complete' : 'Mark Pending'}
                </button>
            </div>
        `;

        this.attachEventListeners(card);
        return card;
    }

    attachEventListeners(card) {
        const viewBtn = card.querySelector('.btn-view');
        const statusBtn = card.querySelector('.btn-status');

        // View details
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onView) {
                this.onView(this.order);
            }
        });

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

        // Card click for view details
        card.addEventListener('click', () => {
            if (this.onView) {
                this.onView(this.order);
            }
        });
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