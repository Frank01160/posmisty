// ============================================
// FIREBASE CONFIGURATION
// Replace with your Firebase project config
// ============================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .then(() => {
        console.log("Firebase offline persistence enabled");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
            console.warn("Browser doesn't support persistence");
        }
    });

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let currentUserType = null; // 'admin' or 'seller'

// ============================================
// CHECK AUTH STATE
// ============================================
function checkAuth() {
    const user = sessionStorage.getItem('amistyPOS_user');
    const userType = sessionStorage.getItem('amistyPOS_userType');
    
    if (!user || !userType) {
        // Redirect to login if not on login page
        if (!window.location.pathname.includes('index.html') && 
            window.location.pathname !== '/' && 
            !window.location.pathname.endsWith('/pos-system/')) {
            window.location.href = '../index.html';
        }
        return false;
    }
    
    currentUser = user;
    currentUserType = userType;
    return true;
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Only check auth on pages other than index
    if (!window.location.pathname.includes('index.html') && 
        window.location.pathname !== '/' && 
        !window.location.pathname.endsWith('/pos-system/')) {
        if (!checkAuth()) return;
        
        // Show admin buttons if manager
        if (currentUserType === 'admin') {
            const adminBtns = document.querySelectorAll('#adminBtn, #historyBtn');
            adminBtns.forEach(btn => {
                if (btn) btn.style.display = 'flex';
            });
        }
        
        // Show user badge
        const userBadge = document.getElementById('userBadge');
        if (userBadge) {
            userBadge.textContent = currentUserType === 'admin' ? 'Manager' : 'Seller';
        }
    }
});

// ============================================
// LOGOUT FUNCTION
// ============================================
function logout() {
    sessionStorage.removeItem('amistyPOS_user');
    sessionStorage.removeItem('amistyPOS_userType');
    window.location.href = '../index.html';
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.5s ease forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ============================================
// FORMAT CURRENCY
// ============================================
function formatCurrency(amount) {
    return 'Ksh ' + parseFloat(amount).toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================
// FORMAT DATE
// ============================================
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// GET SETTINGS FROM FIRESTORE
// ============================================
async function getSettings() {
    try {
        const doc = await db.collection('settings').doc('appSettings').get();
        if (doc.exists) {
            return doc.data();
        }
        // Return defaults
        return {
            managerPIN: 'admin123',
            sellerPIN: 'seller123',
            businessName: 'Amisty Company',
            businessAddress: '',
            businessPhone: ''
        };
    } catch (error) {
        console.error("Error getting settings:", error);
        return {
            managerPIN: 'admin123',
            sellerPIN: 'seller123',
            businessName: 'Amisty Company'
        };
    }
}

// ============================================
// INITIALIZE DEFAULT SETTINGS
// ============================================
async function initializeDefaultSettings() {
    const settingsRef = db.collection('settings').doc('appSettings');
    const doc = await settingsRef.get();
    
    if (!doc.exists) {
        await settingsRef.set({
            managerPIN: 'admin123',
            sellerPIN: 'seller123',
            businessName: 'Amisty Company',
            businessAddress: 'Nairobi, Kenya',
            businessPhone: '07605455312',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Default settings created");
    }
}

// Initialize settings on load
initializeDefaultSettings();