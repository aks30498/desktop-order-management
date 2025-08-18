# Desktop Order Management Application

A lightweight, performant desktop application for managing customer orders with local data storage and printing capabilities. The app runs entirely offline with local SQLite database and file storage.

## Features

### Core Functionality
- **Order Management**: Add, view, and manage customer orders
- **Local Storage**: SQLite database with organized image storage
- **Printing**: Generate professional order slips with barcodes
- **Search & Filter**: Quick search by customer name or phone number
- **Tabs & Views**: Organized viewing with All Orders, Today's Orders, This Week, Completed, and Pending tabs
- **Image Support**: Drag-and-drop image upload with preview and optimization
- **Barcode Generation**: Unique barcodes for each order for easy identification

### User Interface
- Clean, modern design with intuitive navigation
- Responsive layout that adapts to different window sizes
- Real-time search and filtering
- Keyboard shortcuts for common actions
- Notification system for user feedback
- Loading states and error handling

## Technical Stack

- **Framework**: Electron (Cross-platform desktop app)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite (Lightweight, serverless)
- **Image Storage**: Local file system with organized directory structure
- **Barcode**: jsbarcode library for barcode generation
- **Printing**: Electron's built-in printing API
- **Target Platform**: Windows (primary), cross-platform compatible

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Clone or extract the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Building
```bash
# Build for current platform
npm run build

# Build for Windows
npm run build:win

# Build for all platforms
npm run build:all
```

## Project Structure

```
src/
├── main/                 # Electron main process
│   └── main.js          # Main application logic
├── renderer/            # Frontend code
│   ├── components/      # Reusable UI components
│   │   ├── order-card.js
│   │   ├── order-form.js
│   │   └── order-detail.js
│   ├── views/          # Page components
│   │   ├── orders-view.js
│   │   └── main-view.js
│   ├── utils/          # Helper functions
│   │   ├── helpers.js
│   │   └── notifications.js
│   ├── styles/         # CSS files
│   │   ├── main.css
│   │   └── components.css
│   ├── index.html      # Main HTML file
│   └── app.js          # Application entry point
├── database/           # SQLite operations
│   └── database.js     # Database connection and queries
├── services/           # Business logic
│   ├── print-service.js # Printing functionality
│   └── barcode-service.js # Barcode generation
└── assets/            # Static files
```

## Database Schema

The application uses a single SQLite table for orders:

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    order_date DATE NOT NULL,
    order_time TIME NOT NULL,
    day_of_week TEXT NOT NULL,
    image_path TEXT NOT NULL,
    order_notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Image Storage
Images are organized in the following structure:
```
/images/YYYY/MM/DD/orderID_timestamp.ext
```

### Database Location
- **Windows**: `%APPDATA%/desktop-order-management/orders.db`
- **macOS**: `~/Library/Application Support/desktop-order-management/orders.db`
- **Linux**: `~/.config/desktop-order-management/orders.db`

## Usage

### Adding a New Order
1. Click "New Order" button
2. Fill in customer details:
   - Customer Name (required)
   - Phone Number (required)
   - Order Date (auto-filled)
   - Order Time (auto-filled)
   - Order Notes (optional)
3. Upload requirements image (required)
4. Click "Add Order"

### Viewing Orders
- Use tabs to filter orders: All, Today's, This Week, Completed, Pending
- Search by customer name or phone number
- Sort by date or customer name
- Click on any order card to view full details

### Printing Order Slips
1. Open order details
2. Click "Print Slips"
3. Choose printer and settings
4. Print generates both Customer Copy and Business Copy with barcodes

### Managing Order Status
- Click "Mark Complete" or "Mark Pending" on order cards
- Status can also be updated from order detail view
- Orders are automatically organized by status in tabs

## Keyboard Shortcuts

- **Ctrl/Cmd + N**: New Order
- **Ctrl/Cmd + R**: Refresh current view
- **Ctrl/Cmd + 1-5**: Switch between tabs
- **Escape**: Close current form/view

## Performance Optimizations

- **Lazy Loading**: Images and data loaded on-demand
- **Virtual Scrolling**: Efficient handling of large order lists
- **Debounced Search**: Prevents excessive database queries
- **Image Optimization**: Automatic compression and resizing
- **Database Indexing**: Optimized queries for fast search

## Error Handling

The application includes comprehensive error handling:
- Database connection errors
- File system errors
- Image processing errors
- Print system errors
- Network connectivity (for barcode library)

## Backup and Export

### Data Export
- Use "File > Export Data" to create JSON backup
- Exports all orders with metadata
- Can be used for data migration or backup

### Image Backup
Images are stored locally in organized folders. Back up the entire images directory to preserve order images.

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check Node.js version (v14+)
   - Run `npm install` to ensure dependencies
   - Check console for error messages

2. **Database errors**
   - Ensure write permissions to app data directory
   - Check disk space availability
   - Restart application to reinitialize database

3. **Print issues**
   - Verify printer connection and drivers
   - Check printer compatibility with Electron
   - Try PDF export as alternative

4. **Image upload problems**
   - Ensure image file is valid format (JPEG, PNG, GIF, WebP)
   - Check file size (10MB limit)
   - Verify file permissions

### Development Mode
Run with `npm run dev` to enable:
- Developer tools
- Detailed error logging
- Hot reload capabilities

## Contributing

### Code Style
- ES6+ JavaScript features
- Modular architecture with clear separation of concerns
- Comprehensive error handling
- JSDoc comments for functions

### Testing
- Unit tests for core business logic
- Integration tests for database operations
- Manual testing checklist for UI functionality

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please check the documentation or create an issue in the project repository.
