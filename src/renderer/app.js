const { ipcRenderer } = require('electron');

class DesktopOrderManagementApp {
    constructor() {
        this.mainView = null;
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Desktop Order Management App...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Load Barcode library
            await this.loadBarcodeLibrary();

            // Initialize main view
            this.mainView = new MainView();

            // Setup global error handling
            this.setupErrorHandling();

            // Setup connection monitoring
            this.setupConnectionMonitoring();

            // Setup performance monitoring
            this.setupPerformanceMonitoring();

            // Mark as initialized
            this.isInitialized = true;

            console.log('App initialized successfully');
            // Application ready - no notification needed

        } catch (error) {
            console.error('App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async loadBarcodeLibrary() {
        return new Promise((resolve, reject) => {
            // Check if barcode library is already loaded
            if (window.JsBarcode) {
                resolve();
                return;
            }

            // Load barcode library from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
            script.onload = () => {
                console.log('Barcode library loaded');
                resolve();
            };
            script.onerror = () => {
                console.warn('Failed to load Barcode library from CDN, using fallback');
                // Create a fallback JsBarcode function
                window.JsBarcode = function(element, value, options) {
                    if (element.tagName === 'CANVAS') {
                        const ctx = element.getContext('2d');
                        element.width = 200;
                        element.height = 60;
                        ctx.fillStyle = '#f9f9f9';
                        ctx.fillRect(0, 0, 200, 60);
                        ctx.fillStyle = '#666';
                        ctx.font = '12px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText('Barcode (Offline)', 100, 25);
                        ctx.fillText(value, 100, 45);
                    } else {
                        element.innerHTML = `
                            <div style="width: 200px; height: 60px; border: 1px solid #ccc; 
                                 display: flex; align-items: center; justify-content: center; 
                                 background: #f9f9f9; flex-direction: column;">
                                <span style="font-size: 12px; color: #666;">Barcode (Offline)</span>
                                <span style="font-size: 10px; color: #666; font-family: monospace;">${value}</span>
                            </div>
                        `;
                    }
                };
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'Global');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'Promise');
        });

        // IPC error handler
        ipcRenderer.on('error', (event, error) => {
            console.error('IPC error:', error);
            this.handleError(new Error(error), 'IPC');
        });
    }

    setupConnectionMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
            notifications.success('Connection restored');
            if (this.mainView) {
                this.mainView.updateConnectionStatus(true);
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost');
            notifications.warning('Connection lost - working offline');
            if (this.mainView) {
                this.mainView.updateConnectionStatus(false);
            }
        });

        // Set initial connection status
        if (this.mainView) {
            this.mainView.updateConnectionStatus(this.isOnline);
        }
    }

    setupPerformanceMonitoring() {
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                
                // Log memory usage every 5 minutes
                console.log(`Memory usage: ${usedMB}MB / ${limitMB}MB`);
                
                // Warn if memory usage is high
                if (usedMB > limitMB * 0.8) {
                    console.warn('High memory usage detected');
                    notifications.warning('High memory usage detected');
                }
            }, 5 * 60 * 1000); // 5 minutes
        }

        // Monitor frame rate
        let frameCount = 0;
        let lastTime = performance.now();
        
        const monitorFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}`);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitorFPS);
        };
        
        requestAnimationFrame(monitorFPS);
    }

    handleError(error, context = 'App') {
        // Don't show error notifications if app is not initialized
        if (!this.isInitialized) {
            console.error(`${context} error during initialization:`, error);
            return;
        }

        // Rate limit error notifications
        if (!this.lastErrorTime || Date.now() - this.lastErrorTime > 5000) {
            notifications.error(`${context} error: ${error.message}`);
            this.lastErrorTime = Date.now();
        }

        // Send error to main process for logging
        ipcRenderer.send('log-error', {
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    handleInitializationError(error) {
        // Show initialization error in a more user-friendly way
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h1 style="color: #ef4444; margin-bottom: 16px;">Application Failed to Initialize</h1>
                <p style="color: #666; margin-bottom: 20px; max-width: 500px;">
                    The application encountered an error during startup. Please try restarting the application.
                </p>
                <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; font-size: 12px; color: #666; max-width: 600px; overflow: auto;">
                    ${error.message}
                </pre>
                <button onclick="location.reload()" style="margin-top: 20px; background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }

    // Public API methods
    getMainView() {
        return this.mainView;
    }

    isReady() {
        return this.isInitialized;
    }

    getConnectionStatus() {
        return this.isOnline;
    }

    async restart() {
        try {
            console.log('Restarting application...');
            
            // Cleanup current instance
            if (this.mainView) {
                this.mainView.cleanup();
            }
            
            // Clear notifications
            notifications.clear();
            
            // Reset state
            this.isInitialized = false;
            this.mainView = null;
            
            // Reinitialize
            await this.init();
            
        } catch (error) {
            console.error('Restart failed:', error);
            this.handleInitializationError(error);
        }
    }

    // Development helpers
    getDiagnostics() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            currentView: this.mainView ? this.mainView.getCurrentView() : null,
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
    }

    // Export functionality
    async exportDiagnostics() {
        const diagnostics = this.getDiagnostics();
        const filename = `order-management-diagnostics-${Date.now()}.json`;
        Helpers.downloadJson(diagnostics, filename);
        notifications.success('Diagnostics exported');
    }
}

// Initialize app when script loads
const app = new DesktopOrderManagementApp();

// Make app globally available for debugging
window.app = app;

// Handle app-specific IPC events
ipcRenderer.on('app-command', (event, command, data) => {
    switch (command) {
        case 'refresh':
            if (app.mainView) {
                app.mainView.refreshCurrentView();
            }
            break;
        case 'export-diagnostics':
            app.exportDiagnostics();
            break;
        case 'restart':
            app.restart();
            break;
    }
});

console.log('Desktop Order Management App script loaded');