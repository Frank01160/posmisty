// ============================================
// POS.JS - Point of Sale Logic (FIXED)
// Uses Data.js for all database operations
// ============================================

let basket = [];
let currentProduct = null;
let currentRatio = 1;
let currentPrimary = '';
let currentSecondary = '';

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟢 POS initializing...');
    
    // Check auth
    if (!checkAuth()) {
        console.log('❌ Auth failed, redirecting...');
        return;
    }
    
    console.log('✅ Logged in as:', App.userType);
    
    // Show admin links if manager
    if (App.userType === 'admin') {
        const adminLink = document.getElementById('adminLink');
        const historyLink = document.getElementById('historyLink');
        if (adminLink) adminLink.style.display = 'inline';
        if (historyLink) historyLink.style.display = 'inline';
        document.getElementById('userBadge').textContent = 'Manager';
        document.getElementById('userBadge').className = 'badge badge-admin';
    } else {
        document.getElementById('userBadge').textContent = 'Seller';
    }
    
    // Load data
    try {
        await loadAll();
        console.log('✅ Products loaded:', App.products.length);
    } catch (err) {
        console.error('❌ Load error:', err);
    }
    
    // Auto-refresh every 30s
    setInterval(loadAll, 30000);
});

// ============================================
// LOAD ALL DATA
// ============================================
async function loadAll() {
    try {
        await Data.getUnitPairs();
        await Data.getCategories();
        await Data.getProducts();
        
        updateCategoryFilter();
        displayProducts(App.products);
        console.log('🔄 Data refreshed - Products:', App.products.length);
    } catch (err) {
        console.error('Load error:', err);
    }
}

// ============================================
// UPDATE CATEGORY FILTER
// ============================================
function updateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    if (!filter) return;
    
    filter.innerHTML = '<option value="all">📂 All Categories</option>';
    App.categories.forEach(cat => {
        filter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

// ============================================
// DISPLAY PRODUCTS
// ============================================
function displayProducts(list) {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">📦 No products found. Add products in Admin panel.</td></tr>';
        return;
    }
    
    tbody.innerHTML = list.map(p => {
        const unitPair = App.unitPairs.find(u => u.id === p.unitPairId);
        let stockDisplay = p.stock || 0;
        let stockClass = '';
        
        if (p.stock <= 0) stockClass = 'text-red';
        else if (p.stock < 10) stockClass = 'text-amber';
        else stockClass = 'text-green';
        
        if (unitPair && p.stock) {
            const primary = (p.stock / unitPair.ratio).toFixed(2);
            stockDisplay = `${p.stock} ${unitPair.secondaryUnit} (${primary} ${unitPair.primaryUnit})`;
        }
        
        return `
            <tr>
                <td>
                    <strong>${p.name}</strong>
                    <small class="text-muted">${p.category || ''}</small>
                </td>
                <td class="${stockClass}">${stockDisplay}</td>
                <td>${formatCurrency(p.sellingPrice)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openAddModal('${p.id}')">+ Add</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// FILTER PRODUCTS
// ============================================
function filterProducts() {
    const search = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const catId = document.getElementById('categoryFilter')?.value || 'all';
    
    let filtered = App.products;
    
    if (catId !== 'all') {
        filtered = filtered.filter(p => p.categoryId === catId);
    }
    
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            (p.category && p.category.toLowerCase().includes(search))
        );
    }
    
    displayProducts(filtered);
}

// ============================================
// OPEN ADD MODAL
// ============================================
function openAddModal(productId) {
    const product = App.products.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    if (product.stock <= 0) {
        showToast('Out of stock!', 'error');
        return;
    }
    
    currentProduct = product;
    
    const unitPair = App.unitPairs.find(u => u.id === product.unitPairId);
    
    if (unitPair) {
        currentRatio = unitPair.ratio;
        currentPrimary = unitPair.primaryUnit;
        currentSecondary = unitPair.secondaryUnit;
        
        document.getElementById('primaryLabel').textContent = unitPair.primaryUnit;
        document.getElementById('secondaryLabel').textContent = unitPair.secondaryUnit;
        document.getElementById('conversionInfo').textContent = 
            `1 ${unitPair.primaryUnit} = ${unitPair.ratio} ${unitPair.secondaryUnit}`;
    } else {
        currentRatio = 1;
        currentPrimary = 'Qty';
        currentSecondary = 'Qty';
        document.getElementById('primaryLabel').textContent = 'Quantity';
        document.getElementById('secondaryLabel').textContent = 'Quantity';
        document.getElementById('conversionInfo').textContent = '';
    }
    
    document.getElementById('addModalTitle').textContent = product.name;
    document.getElementById('primaryInput').value = '';
    document.getElementById('secondaryInput').value = '';
    
    document.getElementById('addModal').classList.add('active');
    setTimeout(() => document.getElementById('primaryInput').focus(), 300);
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    currentProduct = null;
}

// ============================================
// CONVERT UNITS
// ============================================
function convertUnits(source) {
    const pri = document.getElementById('primaryInput');
    const sec = document.getElementById('secondaryInput');
    
    if (source === 'primary') {
        sec.value = ((parseFloat(pri.value) || 0) * currentRatio).toFixed(2);
    } else {
        pri.value = ((parseFloat(sec.value) || 0) / currentRatio).toFixed(2);
    }
}

// ============================================
// ADD TO BASKET
// ============================================
function addToBasket() {
    if (!currentProduct) return;
    
    const qty = parseFloat(document.getElementById('secondaryInput').value) || 0;
    
    if (qty <= 0) {
        showToast('Enter a valid quantity', 'error');
        return;
    }
    
    if (qty > currentProduct.stock) {
        showToast('Not enough stock!', 'error');
        return;
    }
    
    const existing = basket.findIndex(b => b.productId === currentProduct.id);
    
    if (existing >= 0) {
        basket[existing].quantityInSmallest += qty;
        basket[existing].primaryQty = parseFloat(document.getElementById('primaryInput').value) || 0;
    } else {
        basket.push({
            productId: currentProduct.id,
            productName: currentProduct.name,
            sellingPrice: currentProduct.sellingPrice,
            buyingPrice: currentProduct.buyingPrice || 0,
            quantityInSmallest: qty,
            primaryQty: parseFloat(document.getElementById('primaryInput').value) || 0,
            unitRatio: currentRatio,
            primaryUnit: currentPrimary,
            secondaryUnit: currentSecondary,
            maxStock: currentProduct.stock
        });
    }
    
    renderBasket();
    closeAddModal();
    showToast('Added to basket ✓', 'success');
}

// ============================================
// RENDER BASKET
// ============================================
function renderBasket() {
    const container = document.getElementById('basketItems');
    if (!container) return;
    
    if (!basket.length) {
        container.innerHTML = `
            <div class="basket-empty">
                <span class="empty-icon">🛒</span>
                <p>Basket is empty</p>
                <small>Click + Add on a product</small>
            </div>`;
    } else {
        container.innerHTML = basket.map((item, i) => `
            <div class="basket-row">
                <div class="basket-info">
                    <strong>${item.productName}</strong>
                    <small>${item.primaryQty.toFixed(2)} ${item.primaryUnit} (${item.quantityInSmallest.toFixed(1)} ${item.secondaryUnit})</small>
                </div>
                <div class="basket-qty">
                    <button onclick="changeQty(${i}, -1)">−</button>
                    <span>${item.primaryQty.toFixed(1)}</span>
                    <button onclick="changeQty(${i}, 1)">+</button>
                </div>
                <div class="basket-price">${formatCurrency(item.quantityInSmallest * item.sellingPrice)}</div>
                <button class="btn-remove" onclick="removeItem(${i})">✕</button>
            </div>
        `).join('');
    }
    
    updateTotals();
}

// ============================================
// CHANGE QUANTITY
// ============================================
function changeQty(index, delta) {
    const item = basket[index];
    const change = delta * item.unitRatio;
    const newQty = item.quantityInSmallest + change;
    
    if (newQty <= 0) {
        removeItem(index);
        return;
    }
    
    if (newQty > item.maxStock) {
        showToast('Not enough stock!', 'error');
        return;
    }
    
    item.quantityInSmallest = newQty;
    item.primaryQty = newQty / item.unitRatio;
    renderBasket();
}

// ============================================
// REMOVE ITEM
// ============================================
function removeItem(index) {
    basket.splice(index, 1);
    renderBasket();
}

// ============================================
// CLEAR BASKET
// ============================================
function clearBasket() {
    if (!basket.length) return;
    if (confirm('Clear the basket?')) {
        basket = [];
        renderBasket();
    }
}

// ============================================
// UPDATE TOTALS
// ============================================
function updateTotals() {
    const subtotal = basket.reduce((sum, item) => sum + (item.quantityInSmallest * item.sellingPrice), 0);
    const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('totalAmount');
    const btnEl = document.getElementById('totalBtnAmount');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (btnEl) btnEl.textContent = formatCurrency(total);
}

// ============================================
// COMPLETE SALE
// ============================================
async function completeSale() {
    if (!basket.length) {
        showToast('Basket is empty!', 'error');
        return;
    }
    
    const subtotal = basket.reduce((sum, item) => sum + (item.quantityInSmallest * item.sellingPrice), 0);
    const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    if (!confirm(`Complete sale for ${formatCurrency(total)}?`)) return;
    
    const btn = document.getElementById('completeBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Processing...';
    }
    
    try {
        const saleItems = basket.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantityInSmallest: item.quantityInSmallest,
            primaryQty: item.primaryQty,
            primaryUnit: item.primaryUnit,
            secondaryUnit: item.secondaryUnit,
            unitPrice: item.sellingPrice,
            totalPrice: item.quantityInSmallest * item.sellingPrice,
            profit: (item.sellingPrice - item.buyingPrice) * item.quantityInSmallest
        }));
        
        await Data.createSale({
            items: saleItems,
            subtotal, discount, total,
            totalProfit: saleItems.reduce((s, i) => s + i.profit, 0)
        });
        
        await showReceipt(saleItems, subtotal, discount, total);
        
        basket = [];
        const discountInput = document.getElementById('discountInput');
        if (discountInput) discountInput.value = '0';
        renderBasket();
        
        await Data.getProducts();
        displayProducts(App.products);
        
        showToast('Sale complete! ✓', 'success');
        
    } catch (err) {
        console.error('Sale error:', err);
        showToast('Error processing sale', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Complete Sale</span><span id="totalBtnAmount">' + formatCurrency(0) + '</span>';
        }
    }
}

// ============================================
// RECEIPT
// ============================================
async function showReceipt(items, subtotal, discount, total) {
    const settings = await Data.getSettings();
    const now = new Date();
    
    const html = `
        <div class="thermal-receipt">
            <div class="receipt-header">
                <h2>${settings.businessName || 'Amisty Company'}</h2>
                <p>${settings.businessAddress || ''}</p>
                <p>Tel: ${settings.businessPhone || ''}</p>
            </div>
            <div class="receipt-info">
                <p>Date: ${now.toLocaleDateString('en-KE')}</p>
                <p>Time: ${now.toLocaleTimeString('en-KE')}</p>
            </div>
            <div class="receipt-items">
                ${items.map(item => `
                    <div class="item-row">
                        <span>${item.productName}</span>
                        <span>${item.primaryQty.toFixed(2)} ${item.primaryUnit}</span>
                        <span>${formatCurrency(item.totalPrice)}</span>
                    </div>
                    <div class="item-detail">
                        (${item.quantityInSmallest.toFixed(2)} ${item.secondaryUnit} × ${formatCurrency(item.unitPrice)})
                    </div>
                `).join('')}
            </div>
            <div class="receipt-totals">
                ${discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatCurrency(discount)}</span></div>` : ''}
                <div class="total-row grand"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
            </div>
            <div class="receipt-footer">
                <p>THANK YOU!</p>
                <p>Karibu Tena</p>
            </div>
        </div>
    `;
    
    const receiptEl = document.getElementById('receiptContent');
    if (receiptEl) receiptEl.innerHTML = html;
    document.getElementById('receiptModal').classList.add('active');
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
}

function printReceipt() {
    window.print();
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

console.log('✅ POS module loaded');