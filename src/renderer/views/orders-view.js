class OrdersView {
    constructor() {
        this.currentTab = 'all';
        this.currentSort = 'date-desc';
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalPages = 1;
        this.currentSearch = '';
        this.currentStatusFilter = '';
        this.currentPaymentStatusFilter = '';
        this.orders = [];
        this.filteredOrders = [];
        
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.loadOrders();
        this.updateStats();
    }

    bindElements() {
        this.ordersContainer = document.getElementById('orders-container');
        this.loadingElement = document.getElementById('loading');
        this.noOrdersElement = document.getElementById('no-orders');
        this.searchInput = document.getElementById('search-input');
        this.statusFilter = document.getElementById('status-filter');
        this.paymentStatusFilter = document.getElementById('payment-status-filter');
        this.sortSelect = document.getElementById('sort-select');
        this.tabButtons = document.querySelectorAll('.tab');
        this.refreshBtn = document.getElementById('btn-refresh');
        this.prevPageBtn = document.getElementById('btn-prev-page');
        this.nextPageBtn = document.getElementById('btn-next-page');
        this.pageInfo = document.getElementById('page-info');
        this.clearSearchBtn = document.getElementById('btn-clear-search');
    }

    attachEventListeners() {
        // Tab switching
        this.tabButtons.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Search with debouncing
        this.searchInput.addEventListener('input', 
            Helpers.debounce(() => {
                this.handleSearch();
            }, 300)
        );

        // Clear search
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.handleSearch();
        });

        // Status filter
        this.statusFilter.addEventListener('change', () => {
            this.handleStatusFilter();
        });

        // Payment status filter
        this.paymentStatusFilter.addEventListener('change', () => {
            this.handlePaymentStatusFilter();
        })

        // Sort
        this.sortSelect.addEventListener('change', () => {
            this.handleSort();
        });

        // Refresh
        this.refreshBtn.addEventListener('click', () => {
            this.refreshOrders();
        });

        // Pagination
        this.prevPageBtn.addEventListener('click', () => {
            this.goToPage(this.currentPage - 1);
        });

        this.nextPageBtn.addEventListener('click', () => {
            this.goToPage(this.currentPage + 1);
        });

        // Menu events
        ipcRenderer.on('menu-view-all', () => {
            this.switchTab('all');
        });

        ipcRenderer.on('menu-view-today', () => {
            this.switchTab('today');
        });

        ipcRenderer.on('menu-view-week', () => {
            this.switchTab('week');
        });
    }

    async loadOrders() {
        try {
            this.showLoading(true);
            
            let result;
            switch (this.currentTab) {
                case 'today':
                    result = await Helpers.ipcInvoke('get-todays-orders');
                    break;
                case 'week':
                    result = await Helpers.ipcInvoke('get-weeks-orders');
                    break;
                case 'delivered':
                    result = await Helpers.ipcInvoke('get-orders', { status: 'delivered' });
                    break;
                case 'pending':
                    result = await Helpers.ipcInvoke('get-orders', { status: 'pending' });
                    break;
                default:
                    result = await Helpers.ipcInvoke('get-orders', {});
            }

            if (result.success) {
                this.orders = result.orders || [];
                this.applyFiltersAndSort();
                this.renderOrders();
                this.updatePagination();
            } else {
                throw new Error(result.error || 'Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            notifications.error('Failed to load orders');
            this.orders = [];
            this.renderOrders();
        } finally {
            this.showLoading(false);
        }
    }

    applyFiltersAndSort() {
        let filtered = [...this.orders];

        // Apply search filter
        if (this.currentSearch.trim()) {
            const searchTerm = this.currentSearch.toLowerCase().trim();
            filtered = filtered.filter(order => 
                order.customer_name.toLowerCase().includes(searchTerm) ||
                order.phone_number.includes(searchTerm)
            );
        }

        // Apply status filter
        if (this.currentStatusFilter) {
            filtered = filtered.filter(order => order.status === this.currentStatusFilter);
        }

        // Apply payment status filter
        if (this.currentPaymentStatusFilter) {
            filtered = filtered.filter(order => order.payment_status === this.currentPaymentStatusFilter);
        }

        // Apply sorting
        filtered = Helpers.sortOrders(filtered, this.currentSort);

        this.filteredOrders = filtered;
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
        this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    }

    renderOrders() {
        if (this.filteredOrders.length === 0) {
            this.showNoOrders(true);
            this.showOrders(false);
            return;
        }

        this.showNoOrders(false);
        this.showOrders(true);

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageOrders = this.filteredOrders.slice(startIndex, endIndex);

        this.ordersContainer.innerHTML = '';

        pageOrders.forEach(order => {
            const card = new OrderCard(order, null, this.handleStatusChange.bind(this), this.handlePaymentStatusChange.bind(this) , this.handleViewOrder.bind(this));
            this.ordersContainer.appendChild(card.render());
        });
    }

    async handleStatusChange(orderId, newStatus) {
        try {
            const result = await Helpers.ipcInvoke('update-order-status', orderId, newStatus);
            
            if (result.success) {
                // Update local order status
                const order = this.orders.find(o => o.id === orderId);
                if (order) {
                    order.status = newStatus;
                    order.updated_at = new Date().toISOString();
                }

                // Update filtered orders
                const filteredOrder = this.filteredOrders.find(o => o.id === orderId);
                if (filteredOrder) {
                    filteredOrder.status = newStatus;
                    filteredOrder.updated_at = new Date().toISOString();
                }

                // Re-render if we're on a status-specific tab
                if (this.currentTab === 'delivered' || this.currentTab === 'pending') {
                    this.applyFiltersAndSort();
                    this.renderOrders();
                }

                // Update stats
                this.updateStats();                
            } else {
                throw new Error(result.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            notifications.error('Failed to update order status');
            throw error;
        }
    }

    async handlePaymentStatusChange(orderId, newPaymentStatus) {
    try {
        const result = await Helpers.ipcInvoke('update-payment-status', orderId, newPaymentStatus);

        if (result.success) {
            // Update local order payment status
            const order = this.orders.find(o => o.id === orderId);
            if (order) {
                order.payment_status = newPaymentStatus;
                order.payment_updated_at = new Date().toISOString();
            }
            const filteredOrder = this.filteredOrders.find(o => o.id === orderId);
            if (filteredOrder) {
                filteredOrder.payment_status = newPaymentStatus;
                filteredOrder.updated_at = new Date().toISOString();
            }
            this.refresh()
        } else {
            throw new Error(result.error || 'Failed to update payment status');
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        notifications.error('Failed to update payment status');
        throw error;
    }
}


    handleViewOrder(order) {
        // Dispatch custom event for order view
        const event = new CustomEvent('viewOrder', { detail: order });
        document.dispatchEvent(event);
    }

    switchTab(tabName) {
        // Update active tab
        this.tabButtons.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        this.currentTab = tabName;
        this.currentPage = 1;
        this.loadOrders();
    }

    handleSearch() {
        this.currentSearch = this.searchInput.value;
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOrders();
        this.updatePagination();

        // Show/hide clear button
        this.clearSearchBtn.style.display = this.currentSearch ? 'block' : 'none';
    }

    handleStatusFilter() {
        this.currentStatusFilter = this.statusFilter.value;
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOrders();
        this.updatePagination();
    }

    handlePaymentStatusFilter() {
        this.currentPaymentStatusFilter = this.paymentStatusFilter.value;
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderOrders();
        this.updatePagination();
    }

    handleSort() {
        this.currentSort = this.sortSelect.value;
        this.applyFiltersAndSort();
        this.renderOrders();
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.renderOrders();
            this.updatePagination();
        }
    }

    updatePagination() {
        this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= this.totalPages;
    }

    async refreshOrders() {
        this.refreshBtn.disabled = true;
        this.refreshBtn.textContent = 'Refreshing...';
        
        try {
            await this.loadOrders();
            await this.updateStats();
            // Orders refreshed - no notification needed
        } catch (error) {
            console.error('Error refreshing orders:', error);
            notifications.error('Failed to refresh orders');
        } finally {
            this.refreshBtn.disabled = false;
            this.refreshBtn.textContent = 'Refresh';
        }
    }

    async updateStats() {
        try {
            const results = await Promise.all([
                Helpers.ipcInvoke('get-order-count', {}),
                Helpers.ipcInvoke('get-order-count', { status: 'pending' }),
                Helpers.ipcInvoke('get-todays-orders'),
                Helpers.ipcInvoke('get-weeks-orders')
            ]);

            const [totalResult, pendingResult, todayResult, weekResult] = results;

            if (totalResult.success) {
                document.getElementById('stat-total').textContent = totalResult.count;
            }

            if (pendingResult.success) {
                document.getElementById('stat-pending').textContent = pendingResult.count;
            }

            if (todayResult.success) {
                document.getElementById('stat-today').textContent = todayResult.orders.length;
            }

            if (weekResult.success) {
                document.getElementById('stat-week').textContent = weekResult.orders.length;
            }

            // Update last sync time
            const lastSync = document.getElementById('last-sync');
            if (lastSync) {
                lastSync.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    showLoading(show) {
        this.loadingElement.classList.toggle('hidden', !show);
    }

    showNoOrders(show) {
        this.noOrdersElement.classList.toggle('hidden', !show);
    }

    showOrders(show) {
        this.ordersContainer.style.display = show ? 'table-row-group' : 'none';
    }

    // Public method to refresh from external sources
    refresh() {
        return this.refreshOrders();
    }

    // Public method to add new order to view
    addOrder(order) {
        try {
            console.log('addOrder called with:', order);
            if (!this.orders) {
                console.error('this.orders is undefined, initializing...');
                this.orders = [];
            }
            this.orders.unshift(order);
            this.applyFiltersAndSort();
            this.renderOrders();
            this.updatePagination();
            this.updateStats();
        } catch (error) {
            console.error('Error in addOrder:', error);
            // Fall back to refreshing the entire view
            this.refresh();
        }
    }
}

window.OrdersView = OrdersView;