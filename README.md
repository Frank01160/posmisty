# 🏪 Amisty Company POS System

A powerful, cloud-based Point of Sale system with dual-unit conversion, real-time inventory tracking, thermal receipt printing, and comprehensive sales analytics. Built with vanilla HTML, CSS, JavaScript, and Firebase Firestore.

![POS System](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-web-orange)
![Firebase](https://img.shields.io/badge/database-Firebase-yellow)

---

## ✨ Features

### 🔐 **Dual Login System**
- **Manager Login** - Full access to all features
- **Seller Login** - POS and Reports access only
- PIN-based authentication (no email required)
- Session management with auto-logout

### 🛒 **POS (Point of Sale)**
- Product list in table format (not cards)
- Real-time search and category filtering
- **Dual-unit conversion system** (e.g., Ngunia ↔ Kg, Crate ↔ Pieces)
- Shopping basket with quantity adjustment
- Discount in Ksh (not percentage)
- Auto-calculated totals
- Stock validation before sale

### 📏 **Dual Unit Conversion**
- Create custom unit pairs (e.g., 1 Ngunia = 100 Kg)
- User-defined conversion ratios
- Input in either unit - other auto-calculates
- Example: Enter "3 Ngunia" → system shows "300 Kg"
- Supports: Ngunia, Kg, Crate, Bottles, Packets, Pieces, etc.

### 🖨️ **Thermal Receipt Printing**
- 80mm thermal printer format
- Business name, date, time
- Itemized list with dual units
- Subtotal, discount, total
- Print-ready CSS styles

### 📊 **Reports & Analytics**
- Daily sales summary
- Date range filtering
- Total sales, profit, items sold, transactions
- **Export as CSV (Excel)** 
- **Export as Word Document (DOC)**
- Profit margin calculation

### 📜 **Shop History (Manager Only)**
- Complete audit trail of stock changes
- Filter by category, product, date range
- Product performance analytics
- Profit margin per product
- Stock change reasons tracking

### ⚙️ **Admin Panel (Manager Only)**
- **Unit Pairs Management** - Create/edit/delete unit conversions
- **Categories Management** - Add/edit/delete product categories
- **Products Management** - Full CRUD operations
- **Settings** - Business info, PIN management
- Selling price AND buying price (for profit tracking)

### ☁️ **Cloud Integration**
- Firebase Firestore (real-time database)
- Data syncs across all devices
- Manager can manage inventory remotely
- Offline capability with auto-sync

### 🎨 **User Interface**
- Moving animated backgrounds
- Glassmorphism design
- Fully responsive (mobile & desktop)
- Interactive hover effects
- Toast notifications
- Loading spinners
- Smooth animations

---

## 🚀 **Quick Start**

### **1. Firebase Setup**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** → Name it `amisty-pos`
3. Disable Google Analytics (optional)
4. Click **"Create Project"**

### **2. Enable Firestore**

1. In Firebase Console → **Build** → **Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"**
4. Select your region (e.g., `europe-west` or `us-central`)
5. Click **"Enable"**

### **3. Get Firebase Config**

1. Project Settings → **General** tab
2. Scroll to **"Your apps"** → Click **`</>`** (Web App)
3. Register app name: `Amisty POS`
4. Copy the `firebaseConfig` object

### **4. Configure the App**

Open `js/firebase-config.js` and replace with your config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};