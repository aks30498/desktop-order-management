// ipcRenderer is imported in app.js - access via window.ipcRenderer if needed

class Helpers {
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    static formatDateTime(dateString, timeString) {
        return `${this.formatDate(dateString)} at ${this.formatTime(timeString)}`;
    }

    static formatDateTimeDisplay(dateTimeString) {
        if (!dateTimeString) return '';
        // Normalize SQLite datetime format (YYYY-MM-DD HH:MM:SS)
        const normalized = dateTimeString.replace(' ', 'T');
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) {
            return dateTimeString;
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    static getDayOfWeek(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    static getCurrentDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    static getCurrentTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    static validatePhone(phone) {
        if (!phone) return false;
        
        const cleanPhone = phone.replace(/[\s\-\(\)\.+]/g, '');
        
        // Must contain only digits after cleaning
        if (!/^\d+$/.test(cleanPhone)) {
            return false;
        }
        
        // Indian mobile numbers: 10 digits starting with 6-9
        const mobileRegex = /^[6-9]\d{9}$/;
        
        // Indian landline numbers: 
        // - Without STD code: 6-8 digits starting with 2-9
        const landlineWithoutSTD = /^[2-9]\d{5,7}$/;
        
        // - With STD code: 2-5 digits STD (starting with 0) + 6-8 digits number
        const landlineWithSTD = /^(0[1-9]\d{0,3})[2-9]\d{5,7}$/;
        
        // International format with +91
        const intlMobileRegex = /^91[6-9]\d{9}$/;
        const intlLandlineRegex = /^91(0[1-9]\d{0,3})[2-9]\d{5,7}$/;
        
        return mobileRegex.test(cleanPhone) || 
               landlineWithoutSTD.test(cleanPhone) ||
               landlineWithSTD.test(cleanPhone) ||
               intlMobileRegex.test(cleanPhone) ||
               intlLandlineRegex.test(cleanPhone);
    }

    static formatPhone(phone) {
        if (!phone) return '';
        
        const cleanPhone = phone.replace(/[\s\-\(\)\.+]/g, '');
        
        // Format Indian mobile numbers (10 digits starting with 6-9)
        if (/^[6-9]\d{9}$/.test(cleanPhone)) {
            return `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
        }
        
        // Format international mobile (+91 followed by 10 digits)
        if (/^91[6-9]\d{9}$/.test(cleanPhone)) {
            const number = cleanPhone.slice(2);
            return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
        }
        
        // Format landline with STD code
        const landlineMatch = cleanPhone.match(/^(0[1-9]\d{0,3})([2-9]\d{5,7})$/);
        if (landlineMatch) {
            return `${landlineMatch[1]} ${landlineMatch[2]}`;
        }
        
        // Return original phone if no formatting pattern matches
        return phone;
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static validateImage(file) {
        if (!file) return false;
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        return allowedTypes.includes(file.type) && file.size <= maxSize;
    }

    static async resizeImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays === 0) {
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`;
            }
            return `${diffHours}h ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return this.formatDate(dateString);
        }
    }

    static async showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const result = confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    }

    static sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        }
    }

    static downloadJson(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    static addEventListeners(elements, event, handler) {
        elements.forEach(element => {
            element.addEventListener(event, handler);
        });
    }

    static removeEventListeners(elements, event, handler) {
        elements.forEach(element => {
            element.removeEventListener(event, handler);
        });
    }

    static async ipcInvoke(channel, ...args) {
        try {
            console.log(`IPC Invoke: ${channel}`, args);
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke(channel, ...args);
            console.log(`IPC Result: ${channel}`, result);
            return result;
        } catch (error) {
            console.error(`IPC Error [${channel}]:`, error);
            throw error;
        }
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return imageExtensions.includes(extension);
    }

    static createImageFromPath(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = `file://${imagePath}`;
        });
    }

    static getWeekRange() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
        };
    }

    static sortOrders(orders, sortBy) {
        const sorted = [...orders];
        
        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => {
                    const dateA = new Date(`${a.order_date} ${a.order_time}`);
                    const dateB = new Date(`${b.order_date} ${b.order_time}`);
                    return dateB - dateA;
                });
            case 'date-asc':
                return sorted.sort((a, b) => {
                    const dateA = new Date(`${a.order_date} ${a.order_time}`);
                    const dateB = new Date(`${b.order_date} ${b.order_time}`);
                    return dateA - dateB;
                });
            case 'name-asc':
                return sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
            case 'name-desc':
                return sorted.sort((a, b) => b.customer_name.localeCompare(a.customer_name));
            default:
                return sorted;
        }
    }
}

window.Helpers = Helpers;