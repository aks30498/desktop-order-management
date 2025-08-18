const { BrowserWindow } = require('electron');
const path = require('path');
const barcodeService = require('./barcode-service');

class PrintService {
    constructor() {
        this.printWindow = null;
        this.isWindows = process.platform === 'win32';
    }

    async printOrderSlips(order, copies = 2) {
        try {
            console.log(`Printing ${copies} copies of order slips for order #${order.id}`);
            
            // Generate barcode for the order
            const barcode = await barcodeService.createPrintableBarcode(order, 250, 60);
            
            // Create print HTML
            const printHTML = this.generatePrintHTML(order, barcode, copies);
            
            // Create print window
            await this.createPrintWindow();
            
            // Load content and print
            await this.loadContentAndPrint(printHTML);
            
            console.log('Print dialog opened successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error printing order slips:', error);
            throw error;
        }
    }

    generatePrintHTML(order, barcode, copies = 2) {
        const slipHTML = this.generateSlipHTML(order, barcode);
        const styles = this.getPrintStyles();
        
        let slipsContent = '';
        
        // Generate customer copy
        slipsContent += `
            <div class="slip customer-copy">
                <div class="slip-header">
                    <h2>CUSTOMER COPY</h2>
                </div>
                ${slipHTML}
            </div>
        `;
        
        // Generate business copy
        slipsContent += `
            <div class="slip business-copy">
                <div class="slip-header">
                    <h2>BUSINESS COPY</h2>
                </div>
                ${slipHTML}
            </div>
        `;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Order Slips - Order #${order.id}</title>
                ${styles}
            </head>
            <body>
                <div class="print-container">
                    ${slipsContent}
                </div>
            </body>
            </html>
        `;
    }

    generateSlipHTML(order, barcode) {
        return `
            <div class="slip-content">
                <div class="order-info">
                    <div class="field">
                        <label>Order #:</label>
                        <span class="value">${order.id}</span>
                    </div>
                    
                    <div class="field">
                        <label>Customer:</label>
                        <span class="value">${this.escapeHtml(order.customer_name)}</span>
                    </div>
                    
                    <div class="field">
                        <label>Phone:</label>
                        <span class="value">${this.escapeHtml(order.phone_number)}</span>
                    </div>
                    
                    <div class="field">
                        <label>Date:</label>
                        <span class="value">${this.formatDate(order.order_date)}</span>
                    </div>
                    
                    <div class="field">
                        <label>Time:</label>
                        <span class="value">${this.formatTime(order.order_time)}</span>
                    </div>
                    
                    <div class="field">
                        <label>Day:</label>
                        <span class="value">${order.day_of_week}</span>
                    </div>
                    
                    ${order.order_notes ? `
                        <div class="field notes">
                            <label>Notes:</label>
                            <span class="value">${this.escapeHtml(order.order_notes)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="image-section">
                    ${order.image_path ? `
                        <div class="image-container">
                            <label>Requirements:</label>
                            <img src="file://${order.image_path}" alt="Requirements" class="order-image">
                        </div>
                    ` : '<div class="no-image">No image attached</div>'}
                </div>
                
                <div class="barcode-section">
                    <div class="barcode-container">
                        <div id="barcode-${order.id}" class="barcode-placeholder"></div>
                        <div class="barcode-label">${barcode.value}</div>
                        <script>
                            window.addEventListener('DOMContentLoaded', function() {
                                if (window.JsBarcode) {
                                    const canvas = document.createElement('canvas');
                                    document.getElementById('barcode-${order.id}').appendChild(canvas);
                                    JsBarcode(canvas, '${barcode.value}', {
                                        format: 'CODE128',
                                        width: 2,
                                        height: 50,
                                        displayValue: false,
                                        background: '#ffffff',
                                        lineColor: '#000000',
                                        margin: 5
                                    });
                                } else {
                                    document.getElementById('barcode-${order.id}').innerHTML = 
                                        '<div style="border: 1px solid #000; padding: 8px; background: #fff; font-family: monospace; text-align: center;">' +
                                        '${barcode.value}' +
                                        '</div>';
                                }
                            });
                        </script>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="timestamp">Printed: ${new Date().toLocaleString()}</div>
                    <div class="business-info">Desktop Order Management System</div>
                </div>
            </div>
        `;
    }

    getPrintStyles() {
        return `
            <style>
                @media print {
                    body { margin: 0; }
                    .slip { page-break-after: always; }
                    .slip:last-child { page-break-after: avoid; }
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #000;
                    background: white;
                }
                
                .print-container {
                    width: 100%;
                }
                
                .slip {
                    width: 300px;
                    margin: 0 auto 20px auto;
                    border: 2px solid #000;
                    padding: 15px;
                    background: white;
                }
                
                .slip-header {
                    text-align: center;
                    margin-bottom: 15px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 8px;
                }
                
                .slip-header h2 {
                    font-size: 14px;
                    font-weight: bold;
                    letter-spacing: 1px;
                }
                
                .customer-copy .slip-header h2 {
                    background: #f0f0f0;
                    padding: 4px;
                }
                
                .business-copy .slip-header h2 {
                    background: #e0e0e0;
                    padding: 4px;
                }
                
                .order-info {
                    margin-bottom: 15px;
                }
                
                .field {
                    display: flex;
                    margin-bottom: 6px;
                    align-items: flex-start;
                }
                
                .field label {
                    font-weight: bold;
                    width: 70px;
                    flex-shrink: 0;
                }
                
                .field .value {
                    flex: 1;
                    word-wrap: break-word;
                }
                
                .field.notes {
                    flex-direction: column;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px dashed #ccc;
                }
                
                .field.notes label {
                    margin-bottom: 4px;
                }
                
                .image-section {
                    margin-bottom: 15px;
                    text-align: center;
                }
                
                .image-container label {
                    display: block;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                
                .order-image {
                    max-width: 100%;
                    max-height: 150px;
                    border: 1px solid #ccc;
                    object-fit: contain;
                }
                
                .no-image {
                    padding: 20px;
                    border: 1px dashed #ccc;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                
                .barcode-section {
                    margin-bottom: 15px;
                    text-align: center;
                    border-top: 1px dashed #ccc;
                    padding-top: 10px;
                }
                
                .barcode-container {
                    display: inline-block;
                }
                
                .barcode-placeholder {
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .barcode-placeholder canvas {
                    max-width: 200px;
                    height: auto;
                }
                
                .barcode-label {
                    font-size: 8px;
                    margin-top: 2px;
                    color: #666;
                    font-family: monospace;
                }
                
                .footer {
                    border-top: 2px solid #000;
                    padding-top: 8px;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                }
                
                .timestamp {
                    margin-bottom: 4px;
                }
                
                .business-info {
                    font-weight: bold;
                }
                
                /* Thermal printer optimizations */
                @media print and (max-width: 3in) {
                    .slip {
                        width: 2.8in;
                        font-size: 10px;
                        padding: 10px;
                    }
                    
                    .order-image {
                        max-height: 100px;
                    }
                    
                    .barcode-placeholder canvas {
                        max-width: 150px;
                        height: auto;
                    }
                }
                
                /* Standard printer optimizations */
                @media print and (min-width: 8in) {
                    .print-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 20px;
                    }
                    
                    .slip {
                        margin: 10px;
                    }
                }
            </style>
        `;
    }

    async createPrintWindow() {
        return new Promise((resolve, reject) => {
            try {
                this.printWindow = new BrowserWindow({
                    width: 400,
                    height: 600,
                    show: false,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false
                    },
                    title: 'Print Order Slips'
                });

                this.printWindow.on('closed', () => {
                    this.printWindow = null;
                });

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadContentAndPrint(htmlContent) {
        return new Promise((resolve, reject) => {
            if (!this.printWindow) {
                reject(new Error('Print window not available'));
                return;
            }

            // Load HTML content
            this.printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

            this.printWindow.webContents.once('did-finish-load', async () => {
                try {
                    // Configure print options
                    const printOptions = {
                        silent: false,
                        printBackground: true,
                        color: false,
                        margins: {
                            marginType: 'custom',
                            top: 0.5,
                            bottom: 0.5,
                            left: 0.3,
                            right: 0.3
                        },
                        landscape: false,
                        scaleFactor: 100,
                        pagesPerSheet: 1,
                        collate: false,
                        copies: 1
                    };

                    // Show print dialog
                    await this.printWindow.webContents.print(printOptions);
                    
                    // Close print window after a delay
                    setTimeout(() => {
                        if (this.printWindow) {
                            this.printWindow.close();
                        }
                    }, 1000);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async printToPDF(order, outputPath) {
        try {
            const barcode = await barcodeService.createPrintableBarcode(order, 250, 60);
            const printHTML = this.generatePrintHTML(order, barcode, 2);
            
            await this.createPrintWindow();
            
            return new Promise((resolve, reject) => {
                this.printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHTML)}`);
                
                this.printWindow.webContents.once('did-finish-load', async () => {
                    try {
                        const pdfOptions = {
                            marginsType: 1, // Custom margins
                            pageSize: 'A4',
                            printBackground: true,
                            printSelectionOnly: false,
                            landscape: false
                        };

                        const data = await this.printWindow.webContents.printToPDF(pdfOptions);
                        require('fs').writeFileSync(outputPath, data);
                        
                        this.printWindow.close();
                        resolve(outputPath);
                    } catch (error) {
                        this.printWindow.close();
                        reject(error);
                    }
                });
            });
        } catch (error) {
            console.error('Error creating PDF:', error);
            throw error;
        }
    }

    // Utility methods
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Configuration methods
    getPrintSettings() {
        return {
            thermalPrinter: {
                width: '3in',
                fontSize: '10px',
                qrSize: 60
            },
            standardPrinter: {
                width: '4in',
                fontSize: '12px',
                qrSize: 100
            }
        };
    }

    async testPrint() {
        const testOrder = {
            id: 999,
            customer_name: 'Test Customer',
            phone_number: '(555) 123-4567',
            order_date: new Date().toISOString().split('T')[0],
            order_time: new Date().toTimeString().slice(0, 5),
            day_of_week: 'Monday',
            order_notes: 'This is a test print',
            image_path: null,
            created_at: new Date().toISOString()
        };

        return this.printOrderSlips(testOrder, 1);
    }
}

module.exports = new PrintService();