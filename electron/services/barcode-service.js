class BarcodeService {
    constructor() {
        this.barcodeOptions = {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            textAlign: 'center',
            textPosition: 'bottom',
            textMargin: 2,
            fontOptions: '',
            font: 'monospace',
            background: '#ffffff',
            lineColor: '#000000',
            margin: 10
        };
    }

    generateOrderBarcodeData(order, serverPort = 8080) {
        // If order has an image, create a URL to access it
        if (order.image_path && order.image_path.trim()) {
            // Create a simple HTTP URL that will serve the image
            return `http://localhost:${serverPort}/order-image/${order.id}`;
        }
        
        // Fallback: Create a unique barcode value using order ID and timestamp
        const timestamp = new Date(order.created_at).getTime().toString().slice(-6);
        const paddedId = String(order.id).padStart(4, '0');
        return `ORD${paddedId}${timestamp}`;
    }

    // For server-side, we'll generate a simple barcode representation
    generateBarcodeDataURL(data, options = {}) {
        try {
            // Since we can't use canvas server-side, we'll return a placeholder
            // The actual barcode will be generated client-side using JsBarcode
            return `data:text/plain,${data}`;
        } catch (error) {
            console.error('Error generating barcode data URL:', error);
            throw new Error('Failed to generate barcode');
        }
    }

    generateBarcodeFile(data, filePath, options = {}) {
        try {
            // For server-side file generation, we'll create a simple text representation
            const fs = require('fs');
            const path = require('path');
            
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Create a simple text file with barcode data
            const barcodeText = `Barcode: ${data}\nFormat: CODE128\nGenerated: ${new Date().toISOString()}`;
            fs.writeFileSync(filePath, barcodeText);
            
            return filePath;
        } catch (error) {
            console.error('Error generating barcode file:', error);
            throw new Error('Failed to generate barcode file');
        }
    }

    parseBarcodeData(barcodeString) {
        try {
            // Check if it's a HTTP URL for an order image
            const urlMatch = barcodeString.match(/^http:\/\/localhost:(\d+)\/order-image\/(\d+)$/);
            if (urlMatch) {
                const port = parseInt(urlMatch[1], 10);
                const orderId = parseInt(urlMatch[2], 10);
                return {
                    type: 'image_url',
                    orderId: orderId,
                    port: port,
                    url: barcodeString,
                    barcodeValue: barcodeString
                };
            }
            
            // Check if it's a file path barcode (legacy support)
            if (barcodeString.startsWith('file://')) {
                const filePath = barcodeString.substring(7); // Remove 'file://' prefix
                return {
                    type: 'image',
                    filePath: filePath,
                    barcodeValue: barcodeString
                };
            }
            
            // Parse legacy barcode format: ORD0001123456
            const match = barcodeString.match(/^ORD(\d{4})(\d{6})$/);
            
            if (!match) {
                throw new Error('Invalid barcode format');
            }
            
            const orderId = parseInt(match[1], 10);
            const timestamp = match[2];
            
            return {
                type: 'order',
                orderId: orderId,
                timestamp: timestamp,
                barcodeValue: barcodeString
            };
        } catch (error) {
            console.error('Error parsing barcode data:', error);
            throw new Error('Invalid barcode data');
        }
    }

    isValidBarcodeData(barcodeString) {
        try {
            const data = this.parseBarcodeData(barcodeString);
            return (data.type === 'order' && data.orderId > 0) || 
                   (data.type === 'image' && data.filePath && data.filePath.length > 0) ||
                   (data.type === 'image_url' && data.orderId > 0);
        } catch (error) {
            return false;
        }
    }

    getBarcodeDisplayHTML() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Barcode Scanner</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .scanner-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .scanner-area {
                        border: 2px dashed #ddd;
                        border-radius: 8px;
                        padding: 40px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .scan-result {
                        margin-top: 20px;
                        padding: 16px;
                        background: #f8f9fa;
                        border-radius: 6px;
                        border-left: 4px solid #667eea;
                    }
                    .error {
                        border-left-color: #ef4444;
                        background: #fef2f2;
                    }
                    .success {
                        border-left-color: #10b981;
                        background: #f0fdf4;
                    }
                    .btn {
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 10px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .btn:hover {
                        background: #5a6fd8;
                    }
                    .barcode-input {
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 16px;
                        font-family: monospace;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div class="scanner-container">
                    <h2>Barcode Scanner</h2>
                    <div class="scanner-area">
                        <h3>Manual Entry</h3>
                        <input type="text" id="barcode-input" class="barcode-input" placeholder="Enter barcode value (e.g., ORD0001123456)" maxlength="13">
                        <br>
                        <button class="btn" onclick="scanBarcode()">Scan Barcode</button>
                        <p>Enter the barcode value manually or use a barcode scanner device</p>
                    </div>
                    <div id="scan-result" class="scan-result" style="display: none;"></div>
                </div>

                <script>
                    const barcodeInput = document.getElementById('barcode-input');
                    const resultDiv = document.getElementById('scan-result');

                    barcodeInput.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            scanBarcode();
                        }
                    });

                    function scanBarcode() {
                        const barcodeValue = barcodeInput.value.trim().toUpperCase();
                        
                        if (!barcodeValue) {
                            showResult('Please enter a barcode value', 'error');
                            return;
                        }

                        // Validate barcode format
                        const match = barcodeValue.match(/^ORD(\\d{4})(\\d{6})$/);
                        
                        if (match) {
                            const orderId = parseInt(match[1], 10);
                            const timestamp = match[2];
                            
                            const result = {
                                type: 'order',
                                orderId: orderId,
                                timestamp: timestamp,
                                barcodeValue: barcodeValue
                            };
                            
                            showResult('Barcode scanned successfully: ' + JSON.stringify(result, null, 2), 'success');
                        } else {
                            showResult('Invalid barcode format. Expected format: ORD0001123456', 'error');
                        }
                    }

                    function showResult(message, type) {
                        resultDiv.className = 'scan-result ' + type;
                        resultDiv.style.display = 'block';
                        
                        if (type === 'success') {
                            resultDiv.innerHTML = '<h3>Barcode Scanned Successfully</h3>' + 
                                                '<pre>' + message + '</pre>';
                        } else {
                            resultDiv.innerHTML = '<h3>Scan Failed</h3><p>' + message + '</p>';
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    async createPrintableBarcode(order, width = 300, height = 80) {
        try {
            const barcodeData = this.generateOrderBarcodeData(order);
            
            return {
                dataURL: null, // Will be generated client-side
                value: barcodeData,
                order: order
            };
        } catch (error) {
            console.error('Error creating printable barcode:', error);
            throw error;
        }
    }

    generateBarcodeHTML(barcodeValue, orderData) {
        return `
            <div class="barcode-container" style="text-align: center; margin: 10px 0;">
                <div id="barcode-${orderData.id}" class="barcode-placeholder" style="margin: 10px 0;"></div>
                <div style="font-size: 8px; margin-top: 2px; font-family: monospace;">${barcodeValue}</div>
                <div style="font-size: 8px; margin-top: 2px;">Order #${orderData.id}</div>
                <script>
                    if (window.JsBarcode) {
                        const canvas = document.createElement('canvas');
                        document.getElementById('barcode-${orderData.id}').appendChild(canvas);
                        JsBarcode(canvas, '${barcodeValue}', {
                            format: 'CODE128',
                            width: 2,
                            height: 50,
                            displayValue: false,
                            background: '#ffffff',
                            lineColor: '#000000',
                            margin: 5
                        });
                    } else {
                        document.getElementById('barcode-${orderData.id}').innerHTML = 
                            '<div style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">' +
                            '<div style="font-family: monospace; font-size: 12px;">${barcodeValue}</div>' +
                            '</div>';
                    }
                </script>
            </div>
        `;
    }

    async validateOrderBarcode(barcodeString, orderId) {
        try {
            const barcodeData = this.parseBarcodeData(barcodeString);
            
            // Check if barcode matches the order
            if (barcodeData.type === 'order' && barcodeData.orderId === orderId) {
                return {
                    valid: true,
                    data: barcodeData
                };
            }
            
            return {
                valid: false,
                error: 'Barcode does not match the order'
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    getBarcodeDisplaySize(printSize = 'thermal') {
        const sizes = {
            thermal: { width: 200, height: 60 },
            standard: { width: 300, height: 80 },
            large: { width: 400, height: 100 }
        };
        
        return sizes[printSize] || sizes.standard;
    }

    // Alternative barcode formats
    getBarcodeFormats() {
        return {
            CODE128: 'CODE128', // Default - good for alphanumeric
            CODE39: 'CODE39',   // Alphanumeric, widely supported
            EAN13: 'EAN13',     // Numeric only, 13 digits
            EAN8: 'EAN8',       // Numeric only, 8 digits
            UPC: 'UPC'          // Numeric only, 12 digits
        };
    }

    generateOrderNumber(orderId) {
        // Generate a standardized order number for barcodes
        const timestamp = Date.now().toString().slice(-4);
        const paddedId = String(orderId).padStart(4, '0');
        return `${paddedId}${timestamp}`;
    }
}

module.exports = new BarcodeService();