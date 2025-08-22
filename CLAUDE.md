# Desktop Order Management System - Claude Context

## 📋 Project Overview

A lightweight, offline-first Electron desktop application for managing customer orders with local SQLite storage, image handling, and professional printing capabilities.

### 🎯 Core Requirements
- **Platform**: Windows (primary), cross-platform compatible
- **Storage**: Local SQLite database with sql.js (pure JavaScript)
- **Images**: Local file system storage with drag-and-drop support
- **Printing**: Professional order slips with barcodes
- **Offline**: Fully functional without internet connection

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Electron (main + renderer processes)
- **UI**: Vanilla HTML/CSS/JS with Material Design principles
- **Fonts**: Inter font family + Material Icons
- **Styling**: CSS custom properties (variables) with modern Material Design

### Backend Stack
- **Database**: SQLite via sql.js (pure JavaScript, no Python dependencies)
- **File Storage**: Local filesystem with organized directory structure
- **IPC**: Electron IPC for main-renderer communication
- **Barcodes**: jsbarcode library (CODE128 format)

### Database Schema
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  order_time TIME NOT NULL,          -- 12-hour format (e.g., "2:30 PM")
  image_path TEXT NOT NULL,
  order_notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 UI/UX Design

### Material Design Implementation
- **Color Palette**: Professional blue-based theme (#1976d2 primary)
- **Typography**: Inter font with proper weight hierarchy
- **Components**: Material Design buttons, cards, forms, and inputs
- **Animations**: Smooth transitions with cubic-bezier easing
- **Shadows**: Proper elevation system with 4 shadow levels
- **Responsive**: Mobile-first design with breakpoints

### Current Layout
```
┌─ Header ─────────────────────────────┐
│ App Title              [New Order] │
├─ Sidebar ──┬─ Main Content ─────────┤
│ Quick       │ ┌─ Tabs ─────────────┐ │
│ Actions     │ │ All │Today│Week│etc│ │
│             │ ├─ Content Area ─────┤ │
│ Search &    │ │                   │ │
│ Filter      │ │ Orders/Form/Detail │ │
│             │ │                   │ │
│ Statistics  │ └───────────────────┘ │
└─────────────┴─ Footer ─────────────┘
```

## 📁 File Structure

```
src/
├── main/
│   └── main.js                 # Electron main process
├── database/
│   └── database.js            # SQLite database layer (sql.js)
├── services/
│   ├── barcode-service.js     # Barcode generation (CODE128)
│   └── print-service.js       # Professional printing system
└── renderer/
    ├── index.html             # Main UI structure
    ├── app.js                 # Application initialization
    ├── debug.js               # Debug helpers & fallback handlers
    ├── styles/
    │   ├── main.css           # Core Material Design styles
    │   └── components.css     # Component-specific styles
    ├── utils/
    │   ├── helpers.js         # Utility functions & IPC wrappers
    │   └── notifications.js   # Toast notification system
    ├── components/
    │   ├── order-card.js      # Order display cards
    │   ├── order-form.js      # Order input form
    │   └── order-detail.js    # Order detail view
    └── views/
        ├── main-view.js       # Main navigation controller
        └── orders-view.js     # Orders list management
```

## 🔄 Recent Major Changes

### Session Progress (Latest Updates)
1. **✅ Material Design Upgrade**: Complete UI overhaul with professional styling
2. **✅ 12-Hour Time Format**: Changed from 24-hour to user-friendly 12-hour format
3. **✅ Material Icons**: Replaced text symbols with proper Material Design icons
4. **✅ Enhanced Responsiveness**: Better mobile and tablet support
5. **✅ Form Simplification**: Removed day-of-week field (calculated during printing)
6. **✅ Script Loading Fix**: Resolved "Helpers is not defined" error
7. **✅ Database Optimization**: Simplified schema, removed redundant fields

### Key Technical Fixes
- **Python Dependency Issues**: Solved by switching to sql.js (pure JavaScript SQLite)
- **JavaScript Loading Order**: Fixed script dependencies and initialization
- **UI Functionality**: Ensured all buttons, tabs, and forms work properly
- **Auto-fill Logic**: Date and time fields populate automatically in correct format

## 🎯 Current Features

### ✅ Implemented & Working
- **Order Management**: Add, view, search, and filter orders
- **Image Handling**: Drag-and-drop upload with automatic resizing
- **Database Operations**: CRUD operations with SQLite
- **Professional UI**: Material Design with smooth animations
- **Form Validation**: Real-time validation with error messages
- **Search & Filter**: Find orders by customer name, phone, status, date ranges
- **Statistics**: Dashboard with order counts and metrics
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Auto-fill**: Current date/time populate automatically

### 📋 Order Form Fields
- **Customer Name** (required)
- **Phone Number** (required, auto-formatted)
- **Order Date** (required, auto-filled with current date)
- **Order Time** (required, auto-filled with current time in 12-hour format)
- **Order Notes** (optional, textarea)
- **Requirements Image** (optional, drag-and-drop or file picker)

### 🔄 Views & Navigation
- **Orders View**: Grid of order cards with sorting and filtering
- **Order Form**: Clean form for adding new orders
- **Order Detail**: Full order information with actions
- **Tabs**: All Orders, Today's Orders, This Week, Completed, Pending

## 🖨️ Printing System

### Barcode Integration
- **Format**: CODE128 barcodes for order identification
- **Generation**: jsbarcode library creates clean, scannable codes
- **Placement**: Barcodes included on both customer and business copies

### Print Features
- **Dual Copies**: Customer copy and business copy
- **Order Information**: All relevant order details
- **Day of Week**: Calculated from order date during printing
- **Professional Layout**: Clean, business-appropriate formatting

## 🐛 Known Issues & Considerations

### Development Notes
- **Hot Reload**: Renderer process changes don't require app restart (Ctrl+R)
- **Main Process**: Changes to main.js require full restart
- **Database Path**: Stored in user data directory for persistence
- **Image Storage**: Organized by order ID in local directory structure

### Performance Optimizations
- **Image Compression**: Automatic resize to 800x600 max with 80% quality
- **Database Indexing**: Indexes on order_date, customer_name, phone_number, status
- **Lazy Loading**: Orders loaded in pages for better performance
- **Memory Management**: Proper cleanup and resource disposal

## 🎛️ Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Start development mode
npm run build       # Build for production
npm run pack        # Package for distribution
```

## 🔮 Future Enhancements

### Potential Improvements
- **Export Features**: CSV/Excel export for order data
- **Backup System**: Automated database backups
- **Order Templates**: Save common order types as templates
- **Advanced Search**: More sophisticated filtering options
- **Print Customization**: Customizable print layouts
- **Order Status Workflow**: More detailed status tracking
- **Customer History**: View all orders for a specific customer
- **Reports & Analytics**: Monthly/yearly reports with charts

### Technical Debt
- **Error Handling**: Could be more comprehensive
- **Testing**: Unit tests for components would be beneficial
- **Documentation**: Inline code documentation could be improved
- **Accessibility**: ARIA labels and keyboard navigation enhancements

## 💡 Development Tips

### For Claude Sessions
1. **Always check** the current codebase state before making changes
2. **Test functionality** after major UI/logic changes
3. **Maintain** the Material Design consistency
4. **Consider** mobile responsiveness for any new features
5. **Update** this file when making significant changes

### Common Patterns
- **IPC Calls**: Use `Helpers.ipcInvoke()` for main process communication
- **Error Handling**: Always wrap async operations in try-catch
- **Validation**: Client-side validation with server-side verification
- **Styling**: Use CSS custom properties for consistent theming
- **Components**: Follow the established class-based component pattern

---

*Last Updated: August 2024*
*Status: Active Development - Material Design Implementation Complete*