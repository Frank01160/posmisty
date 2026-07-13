// ============================================
// AUTHENTICATION MODULE
// ============================================

let selectedRole = null;
let loginAttempts = 0;
const MAX_ATTEMPTS = 3;

// ============================================
// CREATE PARTICLES BACKGROUND
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    
    // Add enter key listener for PIN input
    const pinInput = document.getElementById('pinInput');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPIN();
            }
        });
    }
});

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 6 + 2) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 15 + 8) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// ============================================
// SELECT LOGIN CARD
// ============================================
function selectCard(role) {
    selectedRole = role;
    const modal = document.getElementById('pinModal');
    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');
    const icon = document.getElementById('modalIcon');
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    
    // Reset
    pinInput.value = '';
    pinError.textContent = '';
    loginAttempts = 0;
    updatePinDots();
    
    // Set modal content
    if (role === 'admin') {
        title.textContent = '🔐 Manager Access';
        subtitle.textContent = 'Enter manager PIN to continue';
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2" width="60" height="60">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>`;
    } else {
        title.textContent = '🛒 Seller Access';
        subtitle.textContent = 'Enter seller PIN to continue';
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#43e97b" stroke-width="2" width="60" height="60">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
        </svg>`;
    }
    
    modal.classList.add('active');
    setTimeout(() => pinInput.focus(), 300);
}

// ============================================
// CLOSE MODAL
// ============================================
function closeModal() {
    document.getElementById('pinModal').classList.remove('active');
    selectedRole = null;
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').textContent = '';
    loginAttempts = 0;
    updatePinDots();
}

// ============================================
// NUMPAD FUNCTIONS
// ============================================
function addDigit(digit) {
    const input = document.getElementById('pinInput');
    if (input.value.length < 20) {
        input.value += digit;
        updatePinDots();
        document.getElementById('pinError').textContent = '';
    }
}

function clearPIN() {
    document.getElementById('pinInput').value = '';
    updatePinDots();
    document.getElementById('pinError').textContent = '';
}

function deleteDigit() {
    const input = document.getElementById('pinInput');
    input.value = input.value.slice(0, -1);
    updatePinDots();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        verifyPIN();
    }
    updatePinDots();
}

function updatePinDots() {
    const input = document.getElementById('pinInput');
    const dotsContainer = document.getElementById('pinDots');
    if (dotsContainer) {
        dotsContainer.textContent = '•'.repeat(input.value.length);
    }
}

// ============================================
// VERIFY PIN
// ============================================
async function verifyPIN() {
    if (!selectedRole) {
        showToast('Please select a role first', 'error');
        return;
    }
    
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    const enteredPIN = pinInput.value.trim();
    
    if (!enteredPIN) {
        pinError.textContent = 'Please enter your PIN';
        pinInput.focus();
        return;
    }
    
    // Show loading
    const loginBtn = document.querySelector('.btn-login');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:3px;"></div> Verifying...';
    loginBtn.disabled = true;
    
    try {
        const settings = await getSettings();
        let correctPIN;
        
        if (selectedRole === 'admin') {
            correctPIN = settings.managerPIN || 'admin123';
        } else {
            correctPIN = settings.sellerPIN || 'seller123';
        }
        
        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (enteredPIN === correctPIN) {
            // Success
            pinError.textContent = '';
            pinError.style.color = '#43e97b';
            pinError.textContent = '✓ Access granted! Redirecting...';
            
            // Store session
            sessionStorage.setItem('amistyPOS_user', selectedRole);
            sessionStorage.setItem('amistyPOS_userType', selectedRole);
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'pages/pos.html';
            }, 500);
            
        } else {
            // Failed
            loginAttempts++;
            
            if (loginAttempts >= MAX_ATTEMPTS) {
                pinError.textContent = 'Too many attempts. Please wait 30 seconds.';
                pinInput.disabled = true;
                setTimeout(() => {
                    pinInput.disabled = false;
                    loginAttempts = 0;
                    pinError.textContent = '';
                }, 30000);
            } else {
                pinError.textContent = `Incorrect PIN. ${MAX_ATTEMPTS - loginAttempts} attempts remaining.`;
            }
            
            pinInput.value = '';
            updatePinDots();
            pinInput.focus();
            
            // Shake animation
            const modalContent = document.querySelector('.modal-content');
            modalContent.style.animation = 'none';
            modalContent.offsetHeight;
            modalContent.style.animation = 'shake 0.5s ease';
        }
    } catch (error) {
        console.error("Login error:", error);
        pinError.textContent = 'Connection error. Please try again.';
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// ============================================
// SHAKE ANIMATION FOR WRONG PIN
// ============================================
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}`;

const styleSheet = document.createElement('style');
styleSheet.textContent = shakeKeyframes;
document.head.appendChild(styleSheet);

// ============================================
// CLOSE MODAL ON OUTSIDE CLICK
// ============================================
document.addEventListener('click', function(event) {
    const modal = document.getElementById('pinModal');
    if (event.target === modal) {
        closeModal();
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});