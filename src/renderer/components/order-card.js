class OrderCard {
    constructor(order, onEdit, onStatusChange, onPaymentStatusChange, onView, onDelete) {
        this.order = order;
        this.onEdit = onEdit;
        this.onStatusChange = onStatusChange;
        this.onPaymentStatusChange = onPaymentStatusChange;
        this.onView = onView;
        this.onDelete = onDelete;
    }

    render() {
        const row = document.createElement('tr');
        row.className = `order-row${this.order.deleted ? ' order-row-deleted' : ''}`;
        row.dataset.orderId = this.order.id;

        row.innerHTML = `
            <td class="order-id">#${this.order.id}</td>
            <td class="order-customer">${Helpers.sanitizeHtml(this.order.customer_name)}</td>
            <td class="order-phone">${Helpers.sanitizeHtml(this.order.phone_number)}</td>
            <td class="order-date">${Helpers.formatDate(this.order.order_date)}</td>
            <td class="order-time">${this.order.order_time}</td>
            <td class="order-status ${this.order.status}">
                ${this.getStatusMarkup()}
            </td>
            <td class="order-payment-status ${this.order.payment_status}">${this.order.payment_status}</td>
            <td class="image-cell">
                ${this.order.image_path ? 
                    `<button class="btn-link btn-view-image" data-action="view-image">View Image</button>` : 
                    '-'
                }
            </td>
            <td class="table-actions">
                <div class="table-actions-container">
                    ${this.getActionsMarkup()}
                </div>
            </td>
        `;

        this.attachEventListeners(row);
        return row;
    }

    getStatusMarkup() {
        const label = `<div class="status-label">${this.order.status}</div>`;
        const deliveredMeta = this.order.status === 'delivered' && this.order.delivered_at
            ? `<div class="status-meta">${Helpers.formatDateTimeDisplay(this.order.delivered_at)}</div>`
            : '';
        const deletedMeta = this.order.deleted && this.order.deleted_at
            ? `<div class="status-meta">Deleted ${Helpers.formatDateTimeDisplay(this.order.deleted_at)}</div>`
            : '';
        return `${label}${deliveredMeta}${deletedMeta}`;
    }

    getActionsMarkup() {
        const actions = [
            `<button class="btn-link btn-view" data-action="view">View</button>`
        ];

        if (!this.order.deleted) {
            actions.push(`
                <button class="btn-link btn-status" data-action="status">
                    ${this.order.status === 'pending' ? 'Mark Delivered' : 'Mark Pending'}
                </button>
            `);
            actions.push(`
                <button class="btn-link btn-payment-status" data-action="payment_status">
                    ${this.order.payment_status === 'pending' ? 'Mark Payment Done' : 'Mark Payment Pending'}
                </button>
            `);
            actions.push(`
                <button class="btn-link btn-delete" data-action="delete">Delete</button>
            `);
        } else if (this.order.deleted_at) {
            actions.push(`<span class="status-meta">Deleted ${Helpers.formatDateTimeDisplay(this.order.deleted_at)}</span>`);
        }

        return actions.join('');
    }

    attachEventListeners(card) {
        const viewBtn = card.querySelector('.btn-view');
        const statusBtn = card.querySelector('.btn-status');
        const viewImageBtn = card.querySelector('.btn-view-image');
        const paymentStatusBtn = card.querySelector('.btn-payment-status');
        const deleteBtn = card.querySelector('.btn-delete');

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
        if (statusBtn) {
            statusBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newStatus = this.order.status === 'pending' ? 'delivered' : 'pending';
                
                try {
                    statusBtn.disabled = true;
                    statusBtn.textContent = 'Updating...';
                    
                    if (this.onStatusChange) {
                        const updatedOrder = await this.onStatusChange(this.order.id, newStatus);
                        if (updatedOrder) {
                            this.update(updatedOrder);
                        }
                    }
                } catch (error) {
                    console.error('Failed to update status:', error);
                    notifications.error('Failed to update order status');
                } finally {
                    statusBtn.disabled = false;
                }
            });
        }

        if (paymentStatusBtn) {
            paymentStatusBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newStatus = this.order.payment_status === 'pending' ? 'done' : 'pending';
                
                try {
                    paymentStatusBtn.disabled = true;
                    paymentStatusBtn.textContent = 'Updating...';
                    
                    if (this.onPaymentStatusChange) {
                        await this.onPaymentStatusChange(this.order.id, newStatus);
                    }
                    
                    this.order.payment_status = newStatus;
                    this.update(this.order);

                } catch (error) {
                    console.error('Failed to update payment status:', error);
                    notifications.error('Failed to update order payment status');
                } finally {
                    paymentStatusBtn.disabled = false;
                    paymentStatusBtn.textContent = newStatus === 'pending' ? 'Mark Payment Done' : 'Mark Payment Pending';
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.onDelete) {
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Deleting...';
                    try {
                        await this.onDelete(this.order.id);
                    } finally {
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = 'Delete';
                    }
                }
            });
        }

        // Remove row click handler - only explicit View button should trigger view
    }

    update(order) {
        this.order = order;
        const existingRow = document.querySelector(`[data-order-id="${order.id}"]`);
        if (existingRow && existingRow.parentNode) {
            const newRow = this.render();
            existingRow.parentNode.replaceChild(newRow, existingRow);
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
                handlers.onPaymentStatusChange,
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