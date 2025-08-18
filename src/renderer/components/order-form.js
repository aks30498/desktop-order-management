class OrderForm {
    constructor() {
        this.selectedImage = null;
        this.selectedImagePath = null;
        this.isSubmitting = false;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.initializeForm();
    }

    bindElements() {
        this.form = document.getElementById('order-form');
        this.customerNameInput = document.getElementById('customer-name');
        this.phoneNumberInput = document.getElementById('phone-number');
        this.orderDateInput = document.getElementById('order-date');
        this.orderTimeInput = document.getElementById('order-time');
        this.orderNotesInput = document.getElementById('order-notes');
        
        this.imageUploadArea = document.getElementById('image-upload-area');
        this.uploadPlaceholder = this.imageUploadArea.querySelector('.upload-placeholder');
        this.imagePreview = document.getElementById('image-preview');
        this.previewImage = document.getElementById('preview-image');
        this.selectImageBtn = document.getElementById('btn-select-image');
        this.removeImageBtn = document.getElementById('btn-remove-image');
        
        this.submitBtn = document.getElementById('btn-submit-order');
        this.cancelBtn = document.getElementById('btn-cancel-form');
        
        // Error elements
        this.errors = {
            customerName: document.getElementById('error-customer-name'),
            phoneNumber: document.getElementById('error-phone-number'),
            orderDate: document.getElementById('error-order-date'),
            orderTime: document.getElementById('error-order-time'),
            image: document.getElementById('error-image')
        };
    }

    attachEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Cancel button
        this.cancelBtn.addEventListener('click', () => {
            this.handleCancel();
        });


        // Phone number formatting
        this.phoneNumberInput.addEventListener('input', () => {
            this.formatPhoneNumber();
        });

        // Real-time validation
        this.customerNameInput.addEventListener('blur', () => {
            this.validateCustomerName();
        });

        this.phoneNumberInput.addEventListener('blur', () => {
            this.validatePhoneNumber();
        });

        this.orderDateInput.addEventListener('blur', () => {
            this.validateOrderDate();
        });

        this.orderTimeInput.addEventListener('blur', () => {
            this.validateOrderTime();
        });

        // Image upload events
        this.selectImageBtn.addEventListener('click', () => {
            this.selectImage();
        });

        this.removeImageBtn.addEventListener('click', () => {
            this.removeImage();
        });

        // Drag and drop
        this.imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.imageUploadArea.classList.add('dragover');
        });

        this.imageUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.imageUploadArea.classList.remove('dragover');
        });

        this.imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.imageUploadArea.classList.remove('dragover');
            this.handleImageDrop(e);
        });

        // Click to select image
        this.imageUploadArea.addEventListener('click', (e) => {
            if (e.target === this.imageUploadArea || this.uploadPlaceholder.contains(e.target)) {
                this.selectImage();
            }
        });
    }

    initializeForm() {
        // Set current date and time
        this.orderDateInput.value = Helpers.getCurrentDate();
        this.orderTimeInput.value = Helpers.getCurrentTime();
        
        // Focus first input
        this.customerNameInput.focus();
    }


    formatPhoneNumber() {
        const value = this.phoneNumberInput.value;
        const formatted = Helpers.formatPhone(value);
        if (formatted !== value) {
            this.phoneNumberInput.value = formatted;
        }
    }

    async selectImage() {
        try {
            const result = await Helpers.ipcInvoke('select-image');
            if (result.success) {
                await this.loadImage(result.filePath);
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            notifications.error('Failed to select image');
        }
    }

    async loadImage(imagePath) {
        try {
            this.selectedImagePath = imagePath;
            this.previewImage.src = `file://${imagePath}`;
            this.showImagePreview();
            this.clearError('image');
        } catch (error) {
            console.error('Error loading image:', error);
            notifications.error('Failed to load image');
        }
    }

    handleImageDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
            this.handleImageFile(imageFile);
        } else {
            notifications.warning('Please drop a valid image file');
        }
    }

    async handleImageFile(file) {
        if (!Helpers.validateImage(file)) {
            notifications.error('Invalid image file. Please select a JPEG, PNG, GIF, or WebP image under 10MB.');
            return;
        }

        try {
            // Resize image if needed
            const resizedImage = await Helpers.resizeImage(file);
            this.selectedImage = resizedImage;
            
            // Show preview
            const dataUrl = await Helpers.blobToBase64(resizedImage);
            this.previewImage.src = dataUrl;
            this.showImagePreview();
            this.clearError('image');
        } catch (error) {
            console.error('Error processing image:', error);
            notifications.error('Failed to process image');
        }
    }

    showImagePreview() {
        this.uploadPlaceholder.classList.add('hidden');
        this.imagePreview.classList.remove('hidden');
    }

    removeImage() {
        this.selectedImage = null;
        this.selectedImagePath = null;
        this.previewImage.src = '';
        this.uploadPlaceholder.classList.remove('hidden');
        this.imagePreview.classList.add('hidden');
        this.clearError('image');
    }

    validateCustomerName() {
        const value = this.customerNameInput.value.trim();
        if (!Helpers.validateRequired(value)) {
            this.showError('customerName', 'Customer name is required');
            return false;
        }
        this.clearError('customerName');
        return true;
    }

    validatePhoneNumber() {
        const value = this.phoneNumberInput.value.trim();
        if (!Helpers.validateRequired(value)) {
            this.showError('phoneNumber', 'Phone number is required');
            return false;
        }
        if (!Helpers.validatePhone(value)) {
            this.showError('phoneNumber', 'Please enter a valid phone number');
            return false;
        }
        this.clearError('phoneNumber');
        return true;
    }

    validateOrderDate() {
        const value = this.orderDateInput.value;
        if (!value) {
            this.showError('orderDate', 'Order date is required');
            return false;
        }
        this.clearError('orderDate');
        return true;
    }

    validateOrderTime() {
        const value = this.orderTimeInput.value;
        if (!value) {
            this.showError('orderTime', 'Order time is required');
            return false;
        }
        this.clearError('orderTime');
        return true;
    }

    validateImage() {
        if (!this.selectedImage && !this.selectedImagePath) {
            this.showError('image', 'Requirements image is required');
            return false;
        }
        this.clearError('image');
        return true;
    }

    validateForm() {
        const validations = [
            this.validateCustomerName(),
            this.validatePhoneNumber(),
            this.validateOrderDate(),
            this.validateOrderTime(),
            this.validateImage()
        ];

        return validations.every(isValid => isValid);
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
        Object.keys(this.errors).forEach(field => {
            this.clearError(field);
        });
    }

    async handleSubmit() {
        if (this.isSubmitting) return;

        this.clearAllErrors();

        if (!this.validateForm()) {
            notifications.warning('Please fix the errors before submitting');
            return;
        }

        this.isSubmitting = true;
        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Adding Order...';

        try {
            // Prepare order data
            const orderData = {
                customerName: this.customerNameInput.value.trim(),
                phoneNumber: this.phoneNumberInput.value.trim(),
                orderDate: this.orderDateInput.value,
                orderTime: this.orderTimeInput.value,
                orderNotes: this.orderNotesInput.value.trim()
            };

            // Add order to database first
            const addResult = await Helpers.ipcInvoke('add-order', orderData);
            
            if (!addResult.success) {
                throw new Error(addResult.error || 'Failed to add order');
            }

            const orderId = addResult.orderId;

            // Save image
            let imagePath;
            if (this.selectedImage) {
                const imageData = await Helpers.blobToBase64(this.selectedImage);
                const saveResult = await Helpers.ipcInvoke('save-image', imageData, orderId);
                if (!saveResult.success) {
                    throw new Error(saveResult.error || 'Failed to save image');
                }
                imagePath = saveResult.imagePath;
            } else if (this.selectedImagePath) {
                const saveResult = await Helpers.ipcInvoke('save-image', this.selectedImagePath, orderId);
                if (!saveResult.success) {
                    throw new Error(saveResult.error || 'Failed to save image');
                }
                imagePath = saveResult.imagePath;
            }

            // Update order with image path
            if (imagePath) {
                orderData.imagePath = imagePath;
                orderData.id = orderId;
            }

            notifications.success('Order added successfully!');
            
            // Dispatch event to refresh orders view
            const event = new CustomEvent('orderAdded', { 
                detail: { ...orderData, id: orderId, status: 'pending' }
            });
            document.dispatchEvent(event);

            // Reset form
            this.resetForm();

            // Close form
            this.handleCancel();

        } catch (error) {
            console.error('Error submitting order:', error);
            notifications.error(`Failed to add order: ${error.message}`);
        } finally {
            this.isSubmitting = false;
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = 'Add Order';
        }
    }

    handleCancel() {
        if (this.isSubmitting) {
            return;
        }

        // Confirm if form has data
        if (this.hasFormData()) {
            const confirmed = confirm('Are you sure you want to cancel? All entered data will be lost.');
            if (!confirmed) {
                return;
            }
        }

        this.resetForm();
        
        // Dispatch event to close form
        const event = new CustomEvent('closeOrderForm');
        document.dispatchEvent(event);
    }

    hasFormData() {
        return (
            this.customerNameInput.value.trim() ||
            this.phoneNumberInput.value.trim() ||
            this.orderNotesInput.value.trim() ||
            this.selectedImage ||
            this.selectedImagePath
        );
    }

    resetForm() {
        this.form.reset();
        this.initializeForm();
        this.removeImage();
        this.clearAllErrors();
        this.isSubmitting = false;
    }

    show() {
        this.resetForm();
        const formView = document.getElementById('order-form-view');
        formView.classList.remove('hidden');
        this.customerNameInput.focus();
    }

    hide() {
        const formView = document.getElementById('order-form-view');
        formView.classList.add('hidden');
    }
}

window.OrderForm = OrderForm;