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
        if (this.order.deleted && this.order.deleted_at) {
            return `<span class="status-meta">Deleted ${Helpers.formatDateTimeDisplay(this.order.deleted_at)}</span>`;
        }

        return `
            <div class="actions-dropdown">
                <button class="actions-menu-btn" data-action="toggle-menu" aria-label="Actions menu">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="2" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="14" r="1.5"/>
                    </svg>
                </button>
                <div class="actions-menu" data-menu>
                    <button class="menu-item" data-action="view">
                        <span class="menu-item-icon">👁️</span>
                        <span class="menu-item-text">View Details</span>
                    </button>
                    ${!this.order.deleted ? `
                        <button class="menu-item" data-action="status">
                            <span class="menu-item-icon">${this.order.status === 'pending' ? '✅' : '⏱️'}</span>
                            <span class="menu-item-text">${this.order.status === 'pending' ? 'Mark Delivered' : 'Mark Pending'}</span>
                        </button>
                        <button class="menu-item" data-action="payment_status">
                            <span class="menu-item-icon">${this.order.payment_status === 'pending' ? '💰' : '⏳'}</span>
                            <span class="menu-item-text">${this.order.payment_status === 'pending' ? 'Mark Payment Done' : 'Mark Payment Pending'}</span>
                        </button>
                        <div class="menu-divider"></div>
                        <button class="menu-item menu-item-danger" data-action="delete">
                            <span class="menu-item-icon">🗑️</span>
                            <span class="menu-item-text">Delete</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachEventListeners(card) {
        const viewImageBtn = card.querySelector('.btn-view-image');
        const menuBtn = card.querySelector('.actions-menu-btn');
        const menu = card.querySelector('.actions-menu');

        // View image
        if (viewImageBtn) {
            viewImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.order.image_path) {
                    window.open(this.order.image_path, '_blank');
                }
            });
        }

        // Toggle menu
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = menu.classList.contains('show');
                
                // Close all other menus
                document.querySelectorAll('.actions-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                
                menu.classList.toggle('show');
            });

            // Handle menu item clicks
            menu.querySelectorAll('.menu-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = item.dataset.action;
                    menu.classList.remove('show');

                    switch (action) {
                        case 'view':
                            if (this.onView) {
                                this.onView(this.order);
                            }
                            break;

                        case 'status':
                            await this.handleStatusChange(item);
                            break;

                        case 'payment_status':
                            await this.handlePaymentStatusChange(item);
                            break;

                        case 'delete':
                            await this.handleDelete(item);
                            break;
                    }
                });
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menu && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    }

    async handleStatusChange(button) {
        const newStatus = this.order.status === 'pending' ? 'delivered' : 'pending';
        
        try {
            button.disabled = true;
            const icon = button.querySelector('.menu-item-icon');
            const text = button.querySelector('.menu-item-text');
            const originalText = text.textContent;
            text.textContent = 'Updating...';
            
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
            button.disabled = false;
        }
    }

    async handlePaymentStatusChange(button) {
        const newStatus = this.order.payment_status === 'pending' ? 'done' : 'pending';
        
        try {
            button.disabled = true;
            const text = button.querySelector('.menu-item-text');
            const originalText = text.textContent;
            text.textContent = 'Updating...';
            
            if (this.onPaymentStatusChange) {
                await this.onPaymentStatusChange(this.order.id, newStatus);
            }
            
            this.order.payment_status = newStatus;
            this.update(this.order);

        } catch (error) {
            console.error('Failed to update payment status:', error);
            notifications.error('Failed to update order payment status');
        } finally {
            button.disabled = false;
        }
    }

    async handleDelete(button) {
        if (this.onDelete) {
            button.disabled = true;
            const text = button.querySelector('.menu-item-text');
            text.textContent = 'Deleting...';
            try {
                await this.onDelete(this.order.id);
            } finally {
                button.disabled = false;
            }
        }
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