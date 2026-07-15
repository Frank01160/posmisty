// ============================================
// CONFIG.JS - Firebase Init & Global Utilities
// Amisty POS - posmisty Project
// ============================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCHatngD5v8y-k4eMWDkrHgxOGNRJZz8X8",
    authDomain: "posmisty.firebaseapp.com",
    projectId: "posmisty",
    storageBucket: "posmisty.firebasestorage.app",
    messagingSenderId: "920774276098",
    appId: "1:920774276098:web:41b5bded208bfa7678e31b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open - persistence limited');
    }
});

// ============================================
// GLOBAL APP STATE
// ============================================
const App = {
    user: null,
    userType: null,
    settings: null,
    unitPairs: [],
    categories: [],
    products: []
};

// ============================================
// GLOBAL UTILITY FUNCTIONS
// ============================================

// Format currency (Ksh)
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return 'Ksh ' + num.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date with time
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-KE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

// Format date only
function formatDateShort(timestamp) {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check if user is authenticated
function checkAuth() {
    const user = sessionStorage.getItem('amisty_user');
    const userType = sessionStorage.getItem('amisty_userType');
    
    if (!user || !userType) {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('index.html') && currentPath !== '/' && !currentPath.endsWith('/amisty-pos/')) {
            window.location.href = '../index.html';
        }
        return false;
    }
    
    App.user = user;
    App.userType = userType;
    return true;
}

// Logout function
function logout() {
    sessionStorage.removeItem('amisty_user');
    sessionStorage.removeItem('amisty_userType');
    window.location.href = '../index.html';
}

// Loading spinner
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<div class="loading-spinner"></div>';
}

// Get today's date as YYYY-MM-DD
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// Get date X days ago
function getDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

console.log('✅ Config loaded - Firebase initialized');