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
            
            // Convert image to data URL if it exists for better compatibility
            let imageDataUrl = null;
            if (order.image_path) {
                imageDataUrl = await this.imageToDataURL(order.image_path);
            }
            
            // Create print HTML with full features (JsBarcode + images)
            const printHTML = this.generateFullPrintHTML(order, barcode, copies, imageDataUrl);
            
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

    // Full-featured HTML for regular printing (with JsBarcode and images)
    generateFullPrintHTML(order, barcode, copies = 2, imageDataUrl = null) {
        const slipHTML = this.generateFullSlipHTML(order, barcode, imageDataUrl);
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
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
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

    // Full slip HTML with JsBarcode and images
    generateFullSlipHTML(order, barcode, imageDataUrl = null) {
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
                        <span class="value">${this.getDayOfWeek(order.order_date)}</span>
                    </div>
                    
                    ${order.weight ? `
                        <div class="field">
                            <label>Weight:</label>
                            <span class="value">${this.escapeHtml(order.weight)}</span>
                        </div>
                    ` : ''}
                    
                    ${order.address ? `
                        <div class="field">
                            <label>Address:</label>
                            <span class="value">${this.escapeHtml(order.address)}</span>
                        </div>
                    ` : ''}
                    
                    ${order.order_notes ? `
                        <div class="field notes">
                            <label>Notes:</label>
                            <span class="value">${this.escapeHtml(order.order_notes)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="image-section">
                    ${imageDataUrl ? `
                        <div class="image-container">
                            <label>Requirements:</label>
                            <img src="${imageDataUrl}" alt="Requirements" class="order-image">
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
                                        width: 1.5,
                                        height: 40,
                                        displayValue: false,
                                        background: '#ffffff',
                                        lineColor: '#000000',
                                        margin: 2
                                    });
                                } else {
                                    document.getElementById('barcode-${order.id}').innerHTML = 
                                        '<div style="border: 2px solid #000; padding: 8px; background: #fff; font-family: monospace; text-align: center; font-weight: bold;">' +
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

    // Simplified HTML for PDF generation (no external dependencies)
    generatePrintHTML(order, barcode, copies = 2, imageDataUrl = null) {
        const slipHTML = this.generateSlipHTML(order, barcode, imageDataUrl);
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
                <script>
                    // Simple fallback for PDF generation - no external dependencies
                    document.addEventListener('DOMContentLoaded', function() {
                        console.log('PDF content loaded successfully');
                        
                        // Replace barcode placeholders with simple text boxes
                        const barcodeElements = document.querySelectorAll('[id^="barcode-"]');
                        barcodeElements.forEach(element => {
                            const barcodeValue = element.getAttribute('data-value') || '${barcode.value}';
                            element.innerHTML = '<div style="border: 2px solid #000; padding: 8px; background: #fff; font-family: monospace; text-align: center; font-weight: bold; font-size: 12px;">' + barcodeValue + '</div>';
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    generateSlipHTML(order, barcode, imageDataUrl = null) {
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
                        <span class="value">${this.getDayOfWeek(order.order_date)}</span>
                    </div>
                    
                    ${order.weight ? `
                        <div class="field">
                            <label>Weight:</label>
                            <span class="value">${this.escapeHtml(order.weight)}</span>
                        </div>
                    ` : ''}
                    
                    ${order.address ? `
                        <div class="field">
                            <label>Address:</label>
                            <span class="value">${this.escapeHtml(order.address)}</span>
                        </div>
                    ` : ''}
                    
                    ${order.order_notes ? `
                        <div class="field notes">
                            <label>Notes:</label>
                            <span class="value">${this.escapeHtml(order.order_notes)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="image-section">
                    ${imageDataUrl ? `
                        <div class="image-container">
                            <label>Requirements:</label>
                            <img src="${imageDataUrl}" alt="Requirements" class="order-image">
                        </div>
                    ` : '<div class="no-image">No image attached</div>'}
                </div>
                
                <div class="barcode-section">
                    <div class="barcode-container">
                        <div id="barcode-${order.id}" class="barcode-placeholder" data-value="${barcode.value}"></div>
                        <div class="barcode-label">${barcode.value}</div>
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
                    overflow: hidden;
                }
                
                .barcode-container {
                    display: inline-block;
                    max-width: 100%;
                    overflow: hidden;
                }
                
                .barcode-placeholder {
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    max-width: 100%;
                    overflow: hidden;
                }
                
                .barcode-placeholder canvas {
                    max-width: 250px;
                    width: 100%;
                    height: auto;
                    object-fit: contain;
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
                        max-width: 2.5in;
                        width: 100%;
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
                console.log('Creating BrowserWindow for printing...');
                
                this.printWindow = new BrowserWindow({
                    width: 400,
                    height: 600,
                    show: false, // Keep hidden for PDF generation
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false,
                        webSecurity: false // Allow data URLs
                    },
                    title: 'Print Order Slips'
                });

                this.printWindow.on('closed', () => {
                    console.log('Print window closed');
                    this.printWindow = null;
                });

                this.printWindow.on('ready-to-show', () => {
                    console.log('Print window ready to show');
                });

                console.log('Print window created successfully');
                resolve();
            } catch (error) {
                console.error('Error creating print window:', error);
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
            console.log(`Starting full PDF generation for order #${order.id}`);
            
            const barcode = await barcodeService.createPrintableBarcode(order, 250, 60);
            console.log('Barcode generated successfully');
            
            // Convert image to data URL if it exists
            let imageDataUrl = null;
            if (order.image_path) {
                console.log('Converting image to data URL...');
                imageDataUrl = await this.imageToDataURL(order.image_path);
                console.log('Image converted successfully');
            }
            
            console.log('Generating full print HTML for PDF...');
            const printHTML = this.generateFullPrintHTML(order, barcode, 2, imageDataUrl);
            console.log('Print HTML generated successfully');
            
            console.log('Creating PDF window...');
            return await this.generatePDFWithRetry(printHTML, outputPath, 3);
            
        } catch (error) {
            console.error('Error creating PDF:', error);
            throw error;
        }
    }

    async generatePDFWithRetry(htmlContent, outputPath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`PDF generation attempt ${attempt}/${maxRetries}`);
                return await this.generatePDFAttempt(htmlContent, outputPath);
            } catch (error) {
                console.error(`PDF generation attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    // Last attempt failed, throw error
                    throw new Error(`PDF generation failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async generatePDFAttempt(htmlContent, outputPath) {
        return new Promise((resolve, reject) => {
            let pdfWindow = null;
            
            try {
                console.log('Creating PDF window...');
                
                pdfWindow = new BrowserWindow({
                    width: 800,
                    height: 1000,
                    show: false,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        webSecurity: false, // Allow data URLs and external resources
                        allowRunningInsecureContent: false
                    },
                    title: 'PDF Generation'
                });

                // Set shorter timeout
                const timeout = setTimeout(() => {
                    console.error('PDF generation timed out after 15 seconds');
                    if (pdfWindow && !pdfWindow.isDestroyed()) {
                        pdfWindow.close();
                    }
                    reject(new Error('PDF generation timed out after 15 seconds'));
                }, 15000);

                pdfWindow.on('closed', () => {
                    pdfWindow = null;
                });

                console.log('Loading HTML content...');
                pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
                
                pdfWindow.webContents.once('did-finish-load', async () => {
                    try {
                        console.log('HTML loaded, waiting for barcode rendering...');
                        clearTimeout(timeout);
                        
                        // Wait a bit for JsBarcode to render
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        console.log('Generating PDF...');
                        
                        const pdfOptions = {
                            pageSize: 'A4',
                            printBackground: true,
                            marginsType: 0 // No margins
                        };

                        const data = await pdfWindow.webContents.printToPDF(pdfOptions);
                        console.log('PDF data generated, writing to file...');
                        
                        require('fs').writeFileSync(outputPath, data);
                        console.log(`PDF saved successfully: ${outputPath}`);
                        
                        if (!pdfWindow.isDestroyed()) {
                            pdfWindow.close();
                        }
                        resolve(outputPath);
                        
                    } catch (error) {
                        console.error('Error in PDF generation step:', error);
                        clearTimeout(timeout);
                        if (pdfWindow && !pdfWindow.isDestroyed()) {
                            pdfWindow.close();
                        }
                        reject(error);
                    }
                });

                pdfWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
                    console.error('Failed to load HTML content:', errorCode, errorDescription);
                    clearTimeout(timeout);
                    if (pdfWindow && !pdfWindow.isDestroyed()) {
                        pdfWindow.close();
                    }
                    reject(new Error(`Failed to load content: ${errorDescription}`));
                });

            } catch (error) {
                if (pdfWindow && !pdfWindow.isDestroyed()) {
                    pdfWindow.close();
                }
                reject(error);
            }
        });
    }

    async generateSimplePDF(order, outputPath, textContent) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Creating minimal print window for PDF...');
                
                // Create minimal window
                const tempWindow = new BrowserWindow({
                    width: 800,
                    height: 600,
                    show: false,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
                            .slip { border: 2px solid #000; padding: 20px; margin-bottom: 30px; }
                            .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
                            .field { margin-bottom: 8px; }
                            .barcode { border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold; margin: 10px 0; }
                        </style>
                    </head>
                    <body>
                        ${this.generateSimpleSlipHTML(order)}
                        ${this.generateSimpleSlipHTML(order, 'BUSINESS COPY')}
                    </body>
                    </html>
                `;

                // Set short timeout
                const timeout = setTimeout(() => {
                    tempWindow.close();
                    reject(new Error('PDF generation timed out after 10 seconds'));
                }, 10000);

                tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
                
                tempWindow.webContents.once('did-finish-load', async () => {
                    try {
                        clearTimeout(timeout);
                        console.log('Generating PDF from simple HTML...');
                        
                        const data = await tempWindow.webContents.printToPDF({
                            pageSize: 'A4',
                            printBackground: true
                        });
                        
                        require('fs').writeFileSync(outputPath, data);
                        console.log(`PDF saved successfully: ${outputPath}`);
                        
                        tempWindow.close();
                        resolve(outputPath);
                    } catch (error) {
                        clearTimeout(timeout);
                        tempWindow.close();
                        reject(error);
                    }
                });

                tempWindow.webContents.once('did-fail-load', () => {
                    clearTimeout(timeout);
                    tempWindow.close();
                    reject(new Error('Failed to load HTML content'));
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    generateSimpleSlipHTML(order, copyType = 'CUSTOMER COPY') {
        const barcode = `ORD${String(order.id).padStart(4, '0')}${Date.now().toString().slice(-6)}`;
        
        return `
            <div class="slip">
                <div class="header">${copyType}</div>
                <div class="field"><strong>Order #:</strong> ${order.id}</div>
                <div class="field"><strong>Customer:</strong> ${this.escapeHtml(order.customer_name)}</div>
                <div class="field"><strong>Phone:</strong> ${this.escapeHtml(order.phone_number)}</div>
                <div class="field"><strong>Date:</strong> ${this.formatDate(order.order_date)}</div>
                <div class="field"><strong>Time:</strong> ${this.formatTime(order.order_time)}</div>
                <div class="field"><strong>Day:</strong> ${this.getDayOfWeek(order.order_date)}</div>
                ${order.weight ? `<div class="field"><strong>Weight:</strong> ${this.escapeHtml(order.weight)}</div>` : ''}
                ${order.address ? `<div class="field"><strong>Address:</strong> ${this.escapeHtml(order.address)}</div>` : ''}
                ${order.order_notes ? `<div class="field"><strong>Notes:</strong> ${this.escapeHtml(order.order_notes)}</div>` : ''}
                ${order.image_path ? '<div class="field"><strong>Requirements:</strong> Image attached</div>' : ''}
                <div class="barcode">${barcode}</div>
                <div style="text-align: center; font-size: 10px; margin-top: 20px;">
                    Generated: ${new Date().toLocaleString()}<br>
                    Desktop Order Management System
                </div>
            </div>
        `;
    }

    generateSimplePDFContent(order) {
        const barcode = `ORD${String(order.id).padStart(4, '0')}${Date.now().toString().slice(-6)}`;
        
        return `
ORDER SLIP - CUSTOMER COPY
==========================

Order #: ${order.id}
Customer: ${order.customer_name}
Phone: ${order.phone_number}
Date: ${this.formatDate(order.order_date)}
Time: ${this.formatTime(order.order_time)}
Day: ${this.getDayOfWeek(order.order_date)}
${order.weight ? `Weight: ${order.weight}` : ''}
${order.address ? `Address: ${order.address}` : ''}
${order.order_notes ? `Notes: ${order.order_notes}` : ''}
${order.image_path ? 'Requirements: Image attached' : 'Requirements: None'}

Barcode: ${barcode}

Generated: ${new Date().toLocaleString()}
Desktop Order Management System


ORDER SLIP - BUSINESS COPY
===========================

Order #: ${order.id}
Customer: ${order.customer_name}
Phone: ${order.phone_number}
Date: ${this.formatDate(order.order_date)}
Time: ${this.formatTime(order.order_time)}
Day: ${this.getDayOfWeek(order.order_date)}
${order.weight ? `Weight: ${order.weight}` : ''}
${order.address ? `Address: ${order.address}` : ''}
${order.order_notes ? `Notes: ${order.order_notes}` : ''}
${order.image_path ? 'Requirements: Image attached' : 'Requirements: None'}

Barcode: ${barcode}

Generated: ${new Date().toLocaleString()}
Desktop Order Management System
        `.trim();
    }

    // Convert image file to data URL for PDF compatibility
    async imageToDataURL(imagePath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(imagePath)) {
                return null;
            }
            
            const imageBuffer = fs.readFileSync(imagePath);
            const ext = path.extname(imagePath).toLowerCase();
            let mimeType = 'image/jpeg';
            
            switch (ext) {
                case '.png':
                    mimeType = 'image/png';
                    break;
                case '.gif':
                    mimeType = 'image/gif';
                    break;
                case '.webp':
                    mimeType = 'image/webp';
                    break;
                default:
                    mimeType = 'image/jpeg';
            }
            
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        } catch (error) {
            console.error('Error converting image to data URL:', error);
            return null;
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

    getDayOfWeek(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    async testPrint() {
        const testOrder = {
            id: 999,
            customer_name: 'Test Customer',
            phone_number: '(555) 123-4567',
            order_date: new Date().toISOString().split('T')[0],
            order_time: new Date().toTimeString().slice(0, 5),
            order_notes: 'This is a test print',
            image_path: null,
            created_at: new Date().toISOString()
        };

        return this.printOrderSlips(testOrder, 1);
    }
}

module.exports = new PrintService();