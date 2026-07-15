// ============================================
// AUTH.JS - Login Page Logic (FIXED)
// Uses Data.verifyManagerPIN() & Data.verifySellerPIN()
// ============================================

let selectedRole = null;
let loginAttempts = 0;
const MAX_ATTEMPTS = 3;

// ============================================
// SELECT ROLE
// ============================================
function selectRole(role) {
    selectedRole = role;
    loginAttempts = 0;
    
    const modal = document.getElementById('pinModal');
    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');
    const icon = document.getElementById('modalIcon');
    const input = document.getElementById('pinInput');
    const error = document.getElementById('pinError');
    const loginBtn = document.getElementById('loginBtn');
    
    // Reset
    input.value = '';
    error.textContent = '';
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Login →';
    
    // Set modal content based on role
    if (role === 'admin') {
        title.textContent = 'Manager Access';
        subtitle.textContent = 'Enter your manager PIN';
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" width="48" height="48">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>`;
    } else {
        title.textContent = 'Seller Access';
        subtitle.textContent = 'Enter your seller PIN';
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" width="48" height="48">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
        </svg>`;
    }
    
    modal.classList.add('active');
    setTimeout(() => input.focus(), 300);
}

// ============================================
// CLOSE MODAL
// ============================================
function closePinModal() {
    document.getElementById('pinModal').classList.remove('active');
    selectedRole = null;
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').textContent = '';
}

// ============================================
// NUMPAD FUNCTIONS
// ============================================
function addDigit(digit) {
    const input = document.getElementById('pinInput');
    if (input.value.length < 20) {
        input.value += digit;
        document.getElementById('pinError').textContent = '';
    }
}

function clearPIN() {
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').textContent = '';
}

function deleteDigit() {
    const input = document.getElementById('pinInput');
    input.value = input.value.slice(0, -1);
}

// ============================================
// VERIFY PIN - FIXED
// ============================================
async function verifyPIN() {
    if (!selectedRole) {
        showToast('Please select a role first', 'error');
        return;
    }
    
    const input = document.getElementById('pinInput');
    const error = document.getElementById('pinError');
    const loginBtn = document.getElementById('loginBtn');
    const enteredPIN = input.value.trim();
    
    if (!enteredPIN) {
        error.textContent = 'Please enter your PIN';
        input.focus();
        return;
    }
    
    // Show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = 'Verifying...';
    
    try {
        let isValid = false;
        
        // ✅ VERIFY FROM DATA.JS
        if (selectedRole === 'admin') {
            isValid = await Data.verifyManagerPIN(enteredPIN);
        } else {
            isValid = await Data.verifySellerPIN(enteredPIN);
        }
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (isValid) {
            // Success
            error.style.color = '#10B981';
            error.textContent = '✓ Access granted!';
            
            // ✅ FIX: Store correct user type
            sessionStorage.setItem('amisty_user', selectedRole);
            sessionStorage.setItem('amisty_userType', selectedRole);  // <-- THIS WAS THE BUG
            
            // ✅ DEBUG: Log what we're storing
            console.log('✅ Login success - Role:', selectedRole);
            console.log('✅ Stored in session:', sessionStorage.getItem('amisty_userType'));
            
            // Redirect
            setTimeout(() => {
                window.location.href = 'pages/pos.html';
            }, 400);
            
        } else {
            // Failed
            loginAttempts++;
            
            if (loginAttempts >= MAX_ATTEMPTS) {
                error.textContent = 'Too many attempts. Please wait.';
                input.disabled = true;
                loginBtn.disabled = true;
                setTimeout(() => {
                    input.disabled = false;
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = 'Login →';
                    loginAttempts = 0;
                    error.textContent = '';
                }, 15000);
            } else {
                error.textContent = `Wrong PIN. ${MAX_ATTEMPTS - loginAttempts} tries left`;
            }
            
            input.value = '';
            input.focus();
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login →';
        }
        
    } catch (err) {
        console.error('❌ Login error:', err);
        error.textContent = 'Connection error. Try again.';
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login →';
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closePinModal();
    }
    
    if (e.key === 'Enter' && document.getElementById('pinModal').classList.contains('active')) {
        verifyPIN();
    }
});

// Close modal on outside click
document.getElementById('pinModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closePinModal();
    }
});

console.log('✅ Auth module loaded');