class OrderForm {
    constructor() {
        this.selectedImage = null;
        this.selectedImagePath = null;
        this.isSubmitting = false;

        // 🆕 Customer selection state
        this.selectedUserId = null;
        this.customerMode = 'new';
        this.searchDebounceTimer = null;

        this.init();
    }

    init() {
        this.injectStyles();
        this.bindElements();
        this.mountCustomerSelectorUI();
        this.attachEventListeners();
        this.initializeForm();
    }

    // -------------------- STYLES --------------------

    injectStyles() {
        if (document.getElementById('order-form-customer-styles')) return;

        const style = document.createElement('style');
        style.id = 'order-form-customer-styles';
        style.textContent = `
            .customer-mode {
                display: flex;
                gap: 16px;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .customer-mode label {
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
            }

            .existing-customer {
                position: relative;
                margin-bottom: 12px;
            }

            .existing-customer input {
                width: 100%;
            }

            .customer-results {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                max-height: 220px;
                overflow-y: auto;
                z-index: 10;
            }

            .customer-result {
                padding: 8px 10px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            }

            .customer-result:hover {
                background: #f4f4f4;
            }

            .customer-result .name {
                font-weight: 600;
            }

            .customer-result .phone {
                font-size: 12px;
                color: #666;
            }

            .customer-empty {
                padding: 10px;
                font-size: 13px;
                color: #888;
            }

            .hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // -------------------- BIND --------------------

    bindElements() {
        this.form = document.getElementById('order-form');
        this.customerNameInput = document.getElementById('customer-name');
        this.phoneNumberInput = document.getElementById('phone-number');
        this.orderDateInput = document.getElementById('order-date');
        this.orderTimeInput = document.getElementById('order-time');
        this.weightInput = document.getElementById('weight');
        this.addressInput = document.getElementById('address');
        this.orderNotesInput = document.getElementById('order-notes');

        this.imageUploadArea = document.getElementById('image-upload-area');
        this.uploadPlaceholder = this.imageUploadArea.querySelector('.upload-placeholder');
        this.imagePreview = document.getElementById('image-preview');
        this.previewImage = document.getElementById('preview-image');
        this.selectImageBtn = document.getElementById('btn-select-image');
        this.removeImageBtn = document.getElementById('btn-remove-image');

        this.submitBtn = document.getElementById('btn-submit-order');
        this.cancelBtn = document.getElementById('btn-cancel-form');

        this.errors = {
            customerName: document.getElementById('error-customer-name'),
            phoneNumber: document.getElementById('error-phone-number'),
            orderDate: document.getElementById('error-order-date'),
            orderTime: document.getElementById('error-order-time'),
            weight: document.getElementById('error-weight'),
            address: document.getElementById('error-address'),
            image: document.getElementById('error-image')
        };
    }

    // -------------------- UI MOUNT --------------------

    mountCustomerSelectorUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'customer-section';

    wrapper.innerHTML = `
        <div class="form-section-title">Customer Details</div>

        <div class="customer-mode">
            <label>
                <input type="radio" name="customerMode" value="new" checked />
                New Customer
            </label>
            <label>
                <input type="radio" name="customerMode" value="existing" />
                Existing Customer
            </label>
        </div>        
    `;

    // Insert before Customer Name field
    const firstGroup = this.customerNameInput.closest('.form-group');
    firstGroup.before(wrapper);

    this.customerModeInputs = wrapper.querySelectorAll('input[name="customerMode"]');
    this.customerSearchInput = document.getElementById('customer-search-input');
    this.customerSearchResults = document.getElementById('customer-results');
}


    // -------------------- EVENTS --------------------

    attachEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.submitBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.cancelBtn.addEventListener('click', () => this.handleCancel());

        this.phoneNumberInput.addEventListener('input', () => {
            this.formatPhoneNumber();
        });

        this.customerNameInput.addEventListener('blur', () => this.validateCustomerName());
        this.phoneNumberInput.addEventListener('blur', () => this.validatePhoneNumber());
        this.orderDateInput.addEventListener('blur', () => this.validateOrderDate());
        this.orderTimeInput.addEventListener('blur', () => this.validateOrderTime());

        // 🆕 Customer mode toggle
        this.customerModeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleCustomerModeChange(e.target.value);
            });
        });

        // 🆕 Search
        this.customerSearchInput.addEventListener('input', () => {
            clearTimeout(this.searchDebounceTimer);
            const term = this.customerSearchInput.value.trim();

            if (!term) {
                this.customerSearchResults.classList.add('hidden');
                this.customerSearchResults.innerHTML = '';
                return;
            }

            this.searchDebounceTimer = setTimeout(() => {
                this.searchUsers(term);
            }, 300);
        });
    }

    // -------------------- CUSTOMER FLOW --------------------

    handleCustomerModeChange(mode) {
    this.customerMode = mode;

    if (mode === 'existing') {
        // Enable search
        this.customerSearchInput.disabled = false;

        // Disable and clear form fields
        this.clearCustomerFormFields();
        this.disableCustomerFormFields();

        this.selectedUserId = null;
    } else {
        // New customer

        // Clear search
        this.customerSearchInput.value = '';
        this.customerSearchResults.innerHTML = '';
        this.customerSearchResults.classList.add('hidden');

        // Enable form fields
        this.enableCustomerFormFields();
        this.selectedUserId = null;
    }
}


    async searchUsers(term) {
        try {
            const result = await Helpers.ipcInvoke('search-users', term);
            if (!result.success) throw new Error(result.error);
            this.renderUserResults(result.users);
        } catch (err) {
            console.error(err);
            notifications.error('Failed to search users');
        }
    }

    renderUserResults(users) {
        this.customerSearchResults.classList.remove('hidden');

        if (!users.length) {
            this.customerSearchResults.innerHTML =
                `<div class="customer-empty">No users found</div>`;
            return;
        }

        this.customerSearchResults.innerHTML = users.map(u => `
            <div class="customer-result" data-id="${u.id}">
                <div class="name">${u.name}</div>
                <div class="phone">${u.phone_number}</div>
            </div>
        `).join('');

        this.customerSearchResults.querySelectorAll('.customer-result')
            .forEach(el => {
                el.addEventListener('click', () => {
                    const id = Number(el.dataset.id);
                    const user = users.find(u => u.id === id);
                    this.selectExistingUser(user);
                });
            });
    }

    selectExistingUser(user) {
    this.selectedUserId = user.id;

    this.customerNameInput.value = user.name;
    this.phoneNumberInput.value = user.phone_number;
    this.addressInput.value = user.address || '';

    this.disableCustomerFormFields();

    this.customerSearchResults.innerHTML = '';
    this.customerSearchResults.classList.add('hidden');
}


    disableCustomerFormFields() {
    this.customerNameInput.disabled = true;
    this.phoneNumberInput.disabled = true;
    this.addressInput.disabled = true;
}

enableCustomerFormFields() {
    this.customerNameInput.disabled = false;
    this.phoneNumberInput.disabled = false;
    this.addressInput.disabled = false;
}

clearCustomerFormFields() {
    this.customerNameInput.value = '';
    this.phoneNumberInput.value = '';
    this.addressInput.value = '';
}


    // -------------------- ORIGINAL LOGIC (unchanged except userId) --------------------

    initializeForm() {
        this.orderDateInput.value = Helpers.getCurrentDate();
        this.orderTimeInput.value = Helpers.getCurrentTime();
        this.customerNameInput.focus();
    }

    formatPhoneNumber() {
        const value = this.phoneNumberInput.value;
        const formatted = Helpers.formatPhone(value);
        if (formatted !== value) {
            this.phoneNumberInput.value = formatted;
        }
    }

    validateCustomerName() {
        if (this.customerMode === 'existing') return true;
        const value = this.customerNameInput.value.trim();
        if (!Helpers.validateRequired(value)) {
            this.showError('customerName', 'Customer name is required');
            return false;
        }
        this.clearError('customerName');
        return true;
    }

    validatePhoneNumber() {
        if (this.customerMode === 'existing') return true;
        const value = this.phoneNumberInput.value.trim();
        if (!Helpers.validateRequired(value)) {
            this.showError('phoneNumber', 'Phone number is required');
            return false;
        }
        if (!Helpers.validatePhone(value)) {
            this.showError('phoneNumber', 'Invalid phone number');
            return false;
        }
        this.clearError('phoneNumber');
        return true;
    }

    validateOrderDate() {
        if (!this.orderDateInput.value) {
            this.showError('orderDate', 'Order date is required');
            return false;
        }
        this.clearError('orderDate');
        return true;
    }

    validateOrderTime() {
        if (!this.orderTimeInput.value) {
            this.showError('orderTime', 'Order time is required');
            return false;
        }
        this.clearError('orderTime');
        return true;
    }

    validateForm() {
        return [
            this.validateCustomerName(),
            this.validatePhoneNumber(),
            this.validateOrderDate(),
            this.validateOrderTime()
        ].every(Boolean);
    }

    async handleSubmit() {
        if (this.isSubmitting) return;

        this.clearAllErrors();
        if (!this.validateForm()) return;

        this.isSubmitting = true;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Adding Order...';

        try {
            const orderData = {
                userId: this.selectedUserId, // ✅ key change
                customerName: this.customerNameInput.value.trim(),
                phoneNumber: this.phoneNumberInput.value.trim(),
                orderDate: this.orderDateInput.value,
                orderTime: this.orderTimeInput.value,
                weight: this.weightInput.value.trim(),
                address: this.addressInput.value.trim(),
                orderNotes: this.orderNotesInput.value.trim(),
                imagePath: null
            };

            const addResult = await Helpers.ipcInvoke('add-order', orderData);
            if (!addResult.success) throw new Error(addResult.error);

            this.resetForm();
            this.handleCancel();

        } catch (error) {
            console.error(error);
            notifications.error(`Failed to add order`);
        } finally {
            this.isSubmitting = false;
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Add Order';
        }
    }

    handleCancel() {
        if (this.isSubmitting) return;
        this.resetForm();
        document.dispatchEvent(new CustomEvent('closeOrderForm'));
    }

    resetForm() {
        this.form.reset();
        this.initializeForm();
        this.enableCustomerFields();
        this.selectedUserId = null;
        this.clearAllErrors();
    }

    showError(field, message) {
        if (this.errors[field]) {
            this.errors[field].textContent = message;
            this.errors[field].style.display = 'block';
        }
    }

    clearError(field) {
        if (this.errors[field]) {
            this.errors[field].textContent = '';
            this.errors[field].style.display = 'none';
        }
    }

    clearAllErrors() {
        Object.keys(this.errors).forEach(f => this.clearError(f));
    }

    show() {
    this.resetForm();
    const formView = document.getElementById('order-form-view');
    if (formView) {
        formView.classList.remove('hidden');
    }
    this.customerNameInput.focus();
    }

    hide() {
        const formView = document.getElementById('order-form-view');
        if (formView) {
            formView.classList.add('hidden');
        }
    }

}

window.OrderForm = OrderForm;
