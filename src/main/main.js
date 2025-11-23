const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const database = require('../database/database');
const printService = require('../services/print-service');

// Configure autoUpdater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class OrderManagementApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    this.imageServer = null;
    this.serverPort = 8080;
  }

  async initialize() {
    await app.whenReady();
    
    try {
      await database.initialize();
      this.setupAutoUpdater();
      this.createWindow();
      this.setupMenu();
      this.setupIPC();
      this.setupImageStorage();
      this.startImageServer();
    } catch (error) {
      console.error('Application initialization failed:', error);
      app.quit();
    }

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        database.close();
        if (this.imageServer) {
          this.imageServer.close();
        }
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '../renderer/preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Start the update checking interval after the app UI is loaded
      this.setupUpdateInterval(); 
      
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      database.close();
    });
  }
  
  /**
   * Sends update status messages to the renderer process.
   * @param {string} channel - The IPC channel name
   * @param {any} message - The data to send
   */
  sendStatusToWindow(channel, message) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, message);
    }
  }
  
  /**
   * Manually checks for updates and reports status.
   */
  checkUpdateManually() {
    autoUpdater.checkForUpdates();
  }

  /**
   * Sets up a recurring check for updates every 6 hours.
   */
  setupUpdateInterval() {
    // Check on startup
    this.checkUpdateManually();

    // Check at regular intervals (every 6 hours)
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
      console.log('Checking for updates via interval...');
      this.checkUpdateManually();
    }, SIX_HOURS);
  }

  /**
   * Sets up event listeners for electron-updater.
   */
  setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('update:status', { message: 'Checking for update...', status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('update:status', { 
        message: `Update available! Version ${info.version} is downloading...`, 
        status: 'downloading',
        version: info.version
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('update:status', { message: `You are running the latest version: ${info.version}`, status: 'latest' });
    });

    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('update:status', { message: `Update error: ${err.message}`, status: 'error' });
      console.error('Updater Error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendStatusToWindow('update:progress', {
        progress: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('update:status', { 
        message: `Update ${info.version} downloaded. App will restart in 5 seconds to apply.`, 
        status: 'downloaded' 
      });
      
      // Relaunch the app after 5 seconds to install the update
      setTimeout(() => {
        autoUpdater.quitAndInstall();
      }, 5000);
    });

    // Handle manual update check from renderer (using the IPC channel from preload.js)
    ipcMain.on('update:check-manual', (event) => {
      this.checkUpdateManually();
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Order',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow.webContents.send('menu-new-order');
            }
          },
          { type: 'separator' },
          {
            label: 'Export Data',
            click: async () => {
              const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Export Orders Data',
                defaultPath: 'orders-export.json',
                filters: [
                  { name: 'JSON Files', extensions: ['json'] }
                ]
              });

              if (!result.canceled) {
                this.exportData(result.filePath);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'All Orders',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              this.mainWindow.webContents.send('menu-view-all');
            }
          },
          {
            label: 'Today\'s Orders',
            accelerator: 'CmdOrCtrl+2',
            click: () => {
              this.mainWindow.webContents.send('menu-view-today');
            }
          },
          {
            label: 'This Week',
            accelerator: 'CmdOrCtrl+3',
            click: () => {
              this.mainWindow.webContents.send('menu-view-week');
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.mainWindow.reload();
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'About Desktop Order Management',
                message: `Desktop Order Management v${app.getVersion()}`, // Use app.getVersion()
                detail: 'A lightweight desktop application for managing customer orders with local data storage and printing capabilities.'
              });
            }
          },
          { type: 'separator' },
          { 
            label: 'Check for Updates...',
            click: () => {
              this.checkUpdateManually();
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Checking for Updates',
                message: 'The application is now checking for available updates. Status will appear in the application window.',
              });
            }
          }
        ]
      }
    ];

    if (this.isDev) {
      template.push({
        label: 'Development',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            }
          }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    ipcMain.handle('add-order', async (event, orderData) => {
      try {
        const orderId = await database.addOrder(orderData);
        return { success: true, orderId };
      } catch (error) {
        console.error('Error adding order:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-orders', async (event, filter) => {
      try {
        const orders = await database.getOrders(filter);
        return { success: true, orders };
      } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-order-by-id', async (event, id) => {
      try {
        const order = await database.getOrderById(id);
        return { success: true, order };
      } catch (error) {
        console.error('Error fetching order:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-order-status', async (event, id, status) => {
      try {
        const order = await database.updateOrderStatus(id, status);
        return { success: true, order };
      } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-payment-status', async (event, id, status) => {
      try {
        await database.updatePaymentStatus(id, status);
        return { success: true };
      } catch (error) {
        console.error('Error updating order payment status:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('delete-order', async (event, id) => {
      try {
        const order = await database.deleteOrder(id);
        return { success: true, order };
      } catch (error) {
        console.error('Error deleting order:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-todays-orders', async () => {
      try {
        const orders = await database.getTodaysOrders();
        return { success: true, orders };
      } catch (error) {
        console.error('Error fetching today\'s orders:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-weeks-orders', async () => {
      try {
        const orders = await database.getThisWeeksOrders();
        return { success: true, orders };
      } catch (error) {
        console.error('Error fetching week\'s orders:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-order-count', async (event, filter) => {
      try {
        const count = await database.getOrderCount(filter);
        return { success: true, count };
      } catch (error) {
        console.error('Error counting orders:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-image', async (event, imageData, orderId) => {
      try {
        const imagePath = await this.saveOrderImage(imageData, orderId);
        return { success: true, imagePath };
      } catch (error) {
        console.error('Error saving image:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('select-image', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          title: 'Select Requirements Image',
          properties: ['openFile'],
          filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
          ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, filePath: result.filePaths[0] };
        }
        
        return { success: false, error: 'No file selected' };
      } catch (error) {
        console.error('Error selecting image:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('print-order', async (event, orderId) => {
      try {
        const order = await database.getOrderById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        await printService.printOrderSlips(order);
        return { success: true };
      } catch (error) {
        console.error('Error printing order:', error);
        return { success: false, error: error.message };
      }
    });

    // Generate PDF preview of order slips
    ipcMain.handle('generate-order-pdf', async (event, orderId) => {
      try {
        const order = await database.getOrderById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        
        const outputPath = path.join(app.getPath('temp'), `order-${orderId}-slips.pdf`);
        
        await printService.printToPDF(order, outputPath);
        return { success: true, pdfPath: outputPath };
      } catch (error) {
        console.error('Error generating PDF:', error);
        return { success: false, error: error.message };
      }
    });

    // Open file with default system application
    ipcMain.handle('open-file', async (event, filePath) => {
      try {
        await shell.openPath(filePath);
        return { success: true };
      } catch (error) {
        console.error('Error opening file:', error);
        return { success: false, error: error.message };
      }
    });

    // Clear all database data
    ipcMain.handle('clear-all-data', async () => {
      try {
        const result = await database.clearAllData();
        return result;
      } catch (error) {
        console.error('Error clearing database:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('print-to-pdf', async (event, orderId, outputPath) => {
      try {
        const order = await database.getOrderById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        const pdfPath = await printService.printToPDF(order, outputPath);
        return { success: true, filePath: pdfPath };
      } catch (error) {
        console.error('Error creating PDF:', error);
        return { success: false, error: error.message };
      }
    });

    // Preview PDF
    ipcMain.handle('preview-order-pdf', async (event, orderId) => {
      try {
        const order = await database.getOrderById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        
        const outputPath = path.join(app.getPath('temp'), `order-${orderId}-preview.pdf`);
        const result = await printService.previewPDF(order, outputPath);
        return { success: true, filePath: result.path };
      } catch (error) {
        console.error('Error creating PDF preview:', error);
        return { success: false, error: error.message };
      }
    });
  }

  setupImageStorage() {
    const userDataPath = app.getPath('userData');
    this.imagesPath = path.join(userDataPath, 'images');
    
    if (!fs.existsSync(this.imagesPath)) {
      fs.mkdirSync(this.imagesPath, { recursive: true });
    }
  }

  async saveOrderImage(imageData, orderId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const dateDir = path.join(this.imagesPath, String(year), month, day);
    
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    const timestamp = now.getTime();
    const extension = this.getImageExtension(imageData);
    const filename = `order_${orderId}_${timestamp}.${extension}`;
    const imagePath = path.join(dateDir, filename);

    if (imageData.startsWith('data:')) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(imagePath, buffer);
    } else {
      fs.copyFileSync(imageData, imagePath);
    }

    return imagePath;
  }

  getImageExtension(imageData) {
    if (imageData.includes('data:image/png')) return 'png';
    if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) return 'jpg';
    if (imageData.includes('data:image/gif')) return 'gif';
    if (imageData.includes('data:image/webp')) return 'webp';
    return 'jpg';
  }


  async exportData(filePath) {
    try {
      const orders = await database.getOrders();
      const exportData = {
        timestamp: new Date().toISOString(),
        version: app.getVersion(), // Use app.getVersion()
        orders: orders
      };
      
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Export Successful',
        message: 'Orders data exported successfully!',
        detail: `Data saved to: ${filePath}`
      });
    } catch (error) {
      dialog.showErrorBox('Export Failed', `Failed to export data: ${error.message}`);
    }
  }

  startImageServer() {
    try {
      this.imageServer = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        // Handle CORS for web scanning
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle order image requests
        const orderImageMatch = parsedUrl.pathname.match(/^\/order-image\/(\d+)$/);
        if (orderImageMatch) {
          const orderId = parseInt(orderImageMatch[1], 10);
          this.serveOrderImage(orderId, res);
          return;
        }
        
        // Default 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });
      
      this.imageServer.listen(this.serverPort, 'localhost', () => {
        console.log(`📷 Image server started on http://localhost:${this.serverPort}`);
        // Make the port available globally
        global.imageServerPort = this.serverPort;
      });
      
      this.imageServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${this.serverPort} is in use, trying port ${this.serverPort + 1}`);
          this.serverPort += 1;
          global.imageServerPort = this.serverPort;
          this.imageServer.close();
          this.startImageServer();
        } else {
          console.error('Image server error:', err);
        }
      });
    } catch (error) {
      console.error('Failed to start image server:', error);
    }
  }

  async serveOrderImage(orderId, res) {
    try {
      // Get order from database
      const order = await database.getOrderById(orderId);
      if (!order || !order.image_path) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image not found');
        return;
      }
      
      // Check if image file exists
      if (!fs.existsSync(order.image_path)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image file not found');
        return;
      }
      
      // Get file extension to determine content type
      const ext = path.extname(order.image_path).toLowerCase();
      let contentType = 'image/jpeg'; // default
      
      switch (ext) {
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.jpg':
        case '.jpeg':
        default:
          contentType = 'image/jpeg';
          break;
      }
      
      // Serve the image
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });
      
      const imageStream = fs.createReadStream(order.image_path);
      imageStream.pipe(res);
      
      imageStream.on('error', (err) => {
        console.error('Error serving image:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error serving image');
        }
      });
      
    } catch (error) {
      console.error('Error in serveOrderImage:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }
}

const orderApp = new OrderManagementApp();
orderApp.initialize();