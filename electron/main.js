const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
} = require("electron");

const path = require("path");
const fs = require("fs");
const http = require("http");
const url = require("url");

const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// ✅ ALWAYS resolve from __dirname (asar safe)
const database = require(path.join(__dirname, "database", "database.js"));
const printService = require(
  path.join(__dirname, "services", "print-service.js"),
);

/* -------------------------------------------------------
   GLOBAL CRASH GUARD (prevents scary popup on exit)
------------------------------------------------------- */
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

/* -------------------------------------------------------
   AUTO UPDATER CONFIG
------------------------------------------------------- */
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.autoDownload = true;

/* -------------------------------------------------------
   APP CLASS
------------------------------------------------------- */
class OrderManagementApp {
  constructor() {
    this.mainWindow = null;
    this.imageServer = null;
    this.serverPort = 8080;

    // ✅ safest dev check
    this.isDev = !app.isPackaged;
  }

  /* --------------------------------------------------- */
  async initialize() {
    await app.whenReady();

    try {
      await database.initialize();

      this.createWindow();
      this.setupMenu();
      this.setupIPC();
      this.setupImageStorage();
      this.startImageServer();

      this.setupAutoUpdates();
    } catch (err) {
      console.error("Initialization failed:", err);
      app.quit();
    }

    /* ----------------------------------------------- */
    app.on("window-all-closed", () => {
      database.close();
      this.imageServer?.close();
      if (process.platform !== "darwin") app.quit();
    });

    app.on("activate", () => {
      if (!BrowserWindow.getAllWindows().length) {
        this.createWindow();
      }
    });
  }

  /* --------------------------------------------------- */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,

      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: true,
        contextIsolation: false,
      },

      icon: path.join(__dirname, "../assets/icon.png"),
    });

    if (this.isDev) {
      this.mainWindow.loadURL("http://localhost:5173");
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, "../dist-renderer/index.html"),
      );

      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      this.checkUpdateManually();
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  /* --------------------------------------------------- */
  /* AUTO UPDATES */
  /* --------------------------------------------------- */

  setupAutoUpdates() {
    if (this.isDev) return;

    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on("checking-for-update", () => this.sendStatus("checking"));

    autoUpdater.on("update-available", () => this.sendStatus("available"));

    autoUpdater.on("update-not-available", () => this.sendStatus("none"));

    autoUpdater.on("download-progress", (p) =>
      this.sendStatus("progress", p.percent),
    );

    autoUpdater.on("update-downloaded", () => this.sendStatus("downloaded"));
  }

  checkUpdateManually() {
    if (!this.isDev) autoUpdater.checkForUpdatesAndNotify();
  }

  sendStatus(type, payload) {
    if (!this.mainWindow) return;
    this.mainWindow.webContents.send("update:status", { type, payload });
  }

  /* --------------------------------------------------- */
  /* MENU */
  /* --------------------------------------------------- */
  setupMenu() {
    const template = [
      {
        label: "File",
        submenu: [
          {
            label: "New Order",
            click: () => this.mainWindow.webContents.send("menu-new-order"),
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  /* --------------------------------------------------- */
  /* IPC */
  /* --------------------------------------------------- */
  setupIPC() {
    const safe =
      (fn) =>
      async (...args) => {
        try {
          return await fn(...args);
        } catch (e) {
          console.error(e);
          return { success: false, error: e.message };
        }
      };

    ipcMain.handle(
      "get-orders",
      safe((_, f) => database.getOrders(f)),
    );
    ipcMain.handle(
      "add-order",
      safe((_, d) => database.addOrder(d)),
    );
    ipcMain.handle(
      "delete-order",
      safe((_, id) => database.deleteOrder(id)),
    );
    ipcMain.handle(
      "update-order-status",
      safe((_, id, s) => database.updateOrderStatus(id, s)),
    );
    ipcMain.handle(
      "update-payment-status",
      safe((_, id, s) => database.updatePaymentStatus(id, s)),
    );
    ipcMain.handle(
      "search-customers",
      safe((_, q) => database.searchCustomers(q)),
    );
    ipcMain.handle(
      "get-stats",
      safe(() => database.getStats()),
    );

    ipcMain.handle("open-file", (_, p) => shell.openPath(p));

    ipcMain.handle("update:restart", () => autoUpdater.quitAndInstall());
  }

  /* --------------------------------------------------- */
  /* IMAGE STORAGE */
  /* --------------------------------------------------- */
  setupImageStorage() {
    this.imagesPath = path.join(app.getPath("userData"), "images");
    fs.mkdirSync(this.imagesPath, { recursive: true });
  }

  /* --------------------------------------------------- */
  /* IMAGE SERVER */
  /* --------------------------------------------------- */
  startImageServer() {
    this.imageServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");

      const parsed = url.parse(req.url, true);
      const match = parsed.pathname.match(/^\/order-image\/(\d+)/);

      if (!match) {
        res.writeHead(404);
        return res.end();
      }

      this.serveOrderImage(Number(match[1]), res);
    });

    this.imageServer.listen(this.serverPort);
  }

  async serveOrderImage(id, res) {
    const order = await database.getOrderById(id);
    if (!order?.image_path || !fs.existsSync(order.image_path)) {
      res.writeHead(404);
      return res.end();
    }

    fs.createReadStream(order.image_path).pipe(res);
  }
}

/* --------------------------------------------------- */

new OrderManagementApp().initialize();
