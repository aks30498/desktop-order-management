// Debug script to check JavaScript functionality
console.log('Debug script loaded');

// Global function to clear all database data
window.clearAllData = async function() {
    try {
        const confirm = window.confirm('Are you sure you want to delete ALL orders from the database? This cannot be undone.');
        if (!confirm) {
            console.log('Clear data cancelled by user');
            return;
        }
        
        console.log('Clearing all database data...');
        const result = await Helpers.ipcInvoke('clear-all-data');
        
        if (result.success) {
            console.log('✅ All data cleared successfully');
            alert('All data cleared successfully! The page will refresh.');
            location.reload();
        } else {
            console.error('❌ Failed to clear data:', result.error);
            alert('Failed to clear data: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        alert('Error clearing data: ' + error.message);
    }
};

console.log('💡 To clear all database data, run: clearAllData()');

// Check if Helpers is available
window.addEventListener('load', function() {
    try {
        if (typeof Helpers !== 'undefined') {
            console.log('Helpers class is available');
        } else {
            console.warn('Helpers class is not defined');
        }
    } catch (error) {
        console.error('Error checking Helpers:', error);
    }
});

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Check if all required elements exist
    const elements = {
        'btn-new-order': document.getElementById('btn-new-order'),
        'btn-sidebar-new-order': document.getElementById('btn-sidebar-new-order'),
        'tabs': document.querySelectorAll('.tab'),
        'orders-view': document.getElementById('orders-view'),
        'order-form-view': document.getElementById('order-form-view')
    };
    
    console.log('Elements check:', elements);
    
    // Add basic click handlers if classes aren't working
    if (elements['btn-new-order']) {
        elements['btn-new-order'].addEventListener('click', function() {
            console.log('New Order button clicked');
            const ordersView = document.getElementById('orders-view');
            const formView = document.getElementById('order-form-view');
            
            if (ordersView && formView) {
                ordersView.classList.add('hidden');
                formView.classList.remove('hidden');
                console.log('Switched to form view');
                
                // Auto-fill date and time fields
                const orderDateInput = document.getElementById('order-date');
                const orderTimeInput = document.getElementById('order-time');
                
                if (orderDateInput && orderTimeInput) {
                    const now = new Date();
                    orderDateInput.value = now.toISOString().split('T')[0];
                    // Format time in 12-hour format
                    const hours = now.getHours();
                    const minutes = now.getMinutes();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    orderTimeInput.value = timeString;
                    
                    console.log('Auto-filled date and time:', {
                        date: orderDateInput.value,
                        time: orderTimeInput.value
                    });
                }
                
                // Focus on customer name field
                const customerNameInput = document.getElementById('customer-name');
                if (customerNameInput) {
                    setTimeout(() => customerNameInput.focus(), 100);
                }
            }
        });
    }
    
    if (elements['btn-sidebar-new-order']) {
        elements['btn-sidebar-new-order'].addEventListener('click', function() {
            console.log('Sidebar New Order button clicked');
            const ordersView = document.getElementById('orders-view');
            const formView = document.getElementById('order-form-view');
            
            if (ordersView && formView) {
                ordersView.classList.add('hidden');
                formView.classList.remove('hidden');
                console.log('Switched to form view');
                
                // Auto-fill date and time fields
                const orderDateInput = document.getElementById('order-date');
                const orderTimeInput = document.getElementById('order-time');
                
                if (orderDateInput && orderTimeInput) {
                    const now = new Date();
                    orderDateInput.value = now.toISOString().split('T')[0];
                    // Format time in 12-hour format
                    const hours = now.getHours();
                    const minutes = now.getMinutes();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const timeString = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    orderTimeInput.value = timeString;
                    
                    console.log('Auto-filled date and time:', {
                        date: orderDateInput.value,
                        time: orderTimeInput.value
                    });
                }
                
                // Focus on customer name field
                const customerNameInput = document.getElementById('customer-name');
                if (customerNameInput) {
                    setTimeout(() => customerNameInput.focus(), 100);
                }
            }
        });
    }
    
    // Add tab switching
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            console.log('Tab clicked:', tab.dataset.tab);
            
            // Remove active class from all tabs
            elements.tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
        });
    });
    
    // Add close form button
    const closeFormBtn = document.getElementById('btn-close-form');
    if (closeFormBtn) {
        closeFormBtn.addEventListener('click', function() {
            console.log('Close form button clicked');
            const ordersView = document.getElementById('orders-view');
            const formView = document.getElementById('order-form-view');
            
            if (ordersView && formView) {
                formView.classList.add('hidden');
                ordersView.classList.remove('hidden');
                console.log('Switched to orders view');
            }
        });
    }
    
    console.log('Debug handlers attached');
});