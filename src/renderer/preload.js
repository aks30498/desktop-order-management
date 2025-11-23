const { ipcRenderer } = require('electron');

// WARNING: Since contextIsolation is disabled, we must directly attach the
// API to the window object. This is less secure as it allows the renderer
// process to potentially access internal Node.js modules exposed via ipcRenderer.

window.electronAPI = {
    // Two-way communication (Renderer -> Main) using invoke
    invoke: (channel, data) => {
        return ipcRenderer.invoke(channel, data);
    },

    // One-way event listener for the 'New Order' menu command
    onMenuNewOrder: (callback) => {
        ipcRenderer.on('menu-new-order', (event, ...args) => callback(...args));
    },
    
    // Update functions (one-way communication, Renderer -> Main using send, and Main -> Renderer using on)
    checkUpdateManual: () => ipcRenderer.send('update:check-manual'),
    
    onUpdateStatus: (callback) => ipcRenderer.on('update:status', (event, value) => callback(value)),
    onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (event, value) => callback(value)),
};