// ============================================
// POS.JS - Point of Sale Logic (COMPLETE REWRITE)
// Uses Data.js for all database operations
// Handles dual-unit AND single-unit products
// ============================================

let basket = [];
let currentProduct = null;
let currentRatio = 1;
let currentPrimary = 'Units';
let currentSecondary = 'Units';
let hasUnitPair = false;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟢 POS initializing...');
    
    if (!checkAuth()) return;
    
    console.log('✅ Logged in as:', App.userType);
    
    // Setup UI based on user type
    if (App.userType === 'admin') {
        document.getElementById('adminLink').style.display = 'inline';
        document.getElementById('historyLink').style.display = 'inline';
        document.getElementById('userBadge').textContent = 'Manager';
        document.getElementById('userBadge').className = 'badge badge-admin';
    } else {
        document.getElementById('userBadge').textContent = 'Seller';
    }
    
    // Load data
    await loadAll();
    
    // Auto-refresh every 30 seconds
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
    } catch (err) {
        console.error('Load error:', err);
        showToast('Error loading products', 'error');
    }
}

// ============================================
// CATEGORY FILTER
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
// DISPLAY PRODUCTS TABLE
// ============================================
function displayProducts(list) {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (!list || !list.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">📦 No products. Add in Admin panel.</td></tr>';
        return;
    }
    
    tbody.innerHTML = list.map(p => {
        const unitPair = App.unitPairs.find(u => u.id === p.unitPairId);
        let stockText, stockClass, priceText;
        
        // Stock display
        if (p.stock <= 0) {
            stockClass = 'text-red';
            stockText = 'Out of stock';
        } else if (p.stock < 10) {
            stockClass = 'text-amber';
        } else {
            stockClass = 'text-green';
        }
        
        if (unitPair && p.stock > 0) {
            const primaryQty = (p.stock / unitPair.ratio).toFixed(2);
            stockText = `${primaryQty} ${unitPair.primaryUnit} (${p.stock} ${unitPair.secondaryUnit})`;
        } else if (p.stock > 0) {
            stockText = `${p.stock} units`;
        }
        
        // Price display
        if (unitPair) {
            priceText = `${formatCurrency(p.sellingPrice)} / ${unitPair.secondaryUnit}`;
        } else {
            priceText = `${formatCurrency(p.sellingPrice)} / unit`;
        }
        
        return `
            <tr>
                <td>
                    <strong>${p.name}</strong>
                    <small class="text-muted">${p.category || ''}</small>
                </td>
                <td class="${stockClass}">${stockText}</td>
                <td>${priceText}</td>
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
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const catId = document.getElementById('categoryFilter')?.value || 'all';
    
    let filtered = App.products;
    if (catId !== 'all') filtered = filtered.filter(p => p.categoryId === catId);
    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) ||
            (p.category && p.category.toLowerCase().includes(search))
        );
    }
    displayProducts(filtered);
}

// ============================================
// OPEN ADD TO BASKET MODAL
// ============================================
function openAddModal(productId) {
    const product = App.products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        showToast('Product out of stock!', 'error');
        return;
    }
    
    currentProduct = product;
    const unitPair = App.unitPairs.find(u => u.id === product.unitPairId);
    
    if (unitPair) {
        // ===== DUAL UNIT MODE (e.g., Ngunia ↔ Kg) =====
        hasUnitPair = true;
        currentRatio = unitPair.ratio;
        currentPrimary = unitPair.primaryUnit;
        currentSecondary = unitPair.secondaryUnit;
        
        document.getElementById('dualInputGroup').style.display = 'block';
        document.getElementById('singleInputGroup').style.display = 'none';
        document.getElementById('primaryLabel').textContent = unitPair.primaryUnit;
        document.getElementById('secondaryLabel').textContent = unitPair.secondaryUnit;
        document.getElementById('conversionInfo').textContent = 
            `📐 1 ${unitPair.primaryUnit} = ${unitPair.ratio} ${unitPair.secondaryUnit}`;
        document.getElementById('priceInfo').textContent = 
            `💰 Price: ${formatCurrency(product.sellingPrice)} per ${unitPair.secondaryUnit}`;
        document.getElementById('primaryInput').value = '';
        document.getElementById('secondaryInput').value = '';
        
    } else {
        // ===== SINGLE UNIT MODE (e.g., Laptop) =====
        hasUnitPair = false;
        currentRatio = 1;
        currentPrimary = 'Units';
        currentSecondary = 'Units';
        
        document.getElementById('dualInputGroup').style.display = 'none';
        document.getElementById('singleInputGroup').style.display = 'block';
        document.getElementById('singleUnitLabel').textContent = 'Quantity (Units)';
        document.getElementById('conversionInfo').textContent = '📦 Single unit product';
        document.getElementById('priceInfo').textContent = 
            `💰 Price: ${formatCurrency(product.sellingPrice)} per unit`;
        document.getElementById('singleQtyInput').value = '';
    }
    
    document.getElementById('addModalTitle').textContent = product.name;
    document.getElementById('addModal').classList.add('active');
    
    // Focus correct input
    setTimeout(() => {
        if (hasUnitPair) {
            document.getElementById('primaryInput').focus();
        } else {
            document.getElementById('singleQtyInput').focus();
        }
    }, 300);
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    currentProduct = null;
}

// ============================================
// CONVERT UNITS (Dual mode only)
// ============================================
function convertUnits(source) {
    if (!hasUnitPair) return;
    
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
    
    let qtyInSmallest, displayQty;
    
    if (hasUnitPair) {
        // Dual unit: quantity in smallest unit = secondary input
        qtyInSmallest = parseFloat(document.getElementById('secondaryInput').value) || 0;
        displayQty = parseFloat(document.getElementById('primaryInput').value) || 0;
        
        if (qtyInSmallest <= 0) {
            showToast('Enter a valid quantity', 'error');
            return;
        }
        if (qtyInSmallest > currentProduct.stock) {
            showToast(`Not enough stock! Available: ${currentProduct.stock} ${currentSecondary}`, 'error');
            return;
        }
    } else {
        // Single unit
        qtyInSmallest = parseFloat(document.getElementById('singleQtyInput').value) || 0;
        displayQty = qtyInSmallest;
        
        if (qtyInSmallest <= 0) {
            showToast('Enter a valid quantity', 'error');
            return;
        }
        if (qtyInSmallest > currentProduct.stock) {
            showToast(`Not enough stock! Available: ${currentProduct.stock} units`, 'error');
            return;
        }
    }
    
    // Check if already in basket
    const existingIndex = basket.findIndex(b => b.productId === currentProduct.id);
    
    if (existingIndex >= 0) {
        basket[existingIndex].quantityInSmallest += qtyInSmallest;
        basket[existingIndex].primaryQty += displayQty;
    } else {
        basket.push({
            productId: currentProduct.id,
            productName: currentProduct.name,
            sellingPrice: currentProduct.sellingPrice,
            buyingPrice: currentProduct.buyingPrice || 0,
            quantityInSmallest: qtyInSmallest,
            primaryQty: displayQty,
            unitRatio: currentRatio,
            primaryUnit: currentPrimary,
            secondaryUnit: currentSecondary,
            maxStock: currentProduct.stock,
            hasUnitPair: hasUnitPair
        });
    }
    
    renderBasket();
    closeAddModal();
    showToast('✓ Added to basket', 'success');
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
        container.innerHTML = basket.map((item, i) => {
            let qtyText;
            if (item.hasUnitPair) {
                qtyText = `${item.primaryQty.toFixed(2)} ${item.primaryUnit} = ${item.quantityInSmallest.toFixed(2)} ${item.secondaryUnit}`;
            } else {
                qtyText = `${item.primaryQty} Units`;
            }
            
            return `
                <div class="basket-row">
                    <div class="basket-info">
                        <strong>${item.productName}</strong>
                        <small>${qtyText}</small>
                    </div>
                    <div class="basket-qty">
                        <button onclick="changeQty(${i}, -1)">−</button>
                        <span>${item.primaryQty.toFixed(1)}</span>
                        <button onclick="changeQty(${i}, 1)">+</button>
                    </div>
                    <div class="basket-price">${formatCurrency(item.quantityInSmallest * item.sellingPrice)}</div>
                    <button class="btn-remove" onclick="removeItem(${i})">✕</button>
                </div>
            `;
        }).join('');
    }
    
    updateTotals();
}

// ============================================
// CHANGE BASKET QUANTITY
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
// REMOVE FROM BASKET
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
    if (confirm('Clear the entire basket?')) {
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
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
    document.getElementById('totalBtnAmount').textContent = formatCurrency(total);
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
    btn.disabled = true;
    btn.innerHTML = '⏳ Processing...';
    
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
            subtotal: subtotal,
            discount: discount,
            total: total,
            totalProfit: saleItems.reduce((s, i) => s + i.profit, 0)
        });
        
        // Show receipt
        await showReceipt(saleItems, subtotal, discount, total);
        
        // Reset
        basket = [];
        document.getElementById('discountInput').value = '0';
        renderBasket();
        await Data.getProducts();
        displayProducts(App.products);
        
        showToast('✅ Sale complete!', 'success');
        
    } catch (err) {
        console.error('Sale error:', err);
        showToast('Error processing sale', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Complete Sale</span><span id="totalBtnAmount">Ksh 0.00</span>';
    }
}

// ============================================
// SHOW RECEIPT
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
                <p>Server: ${App.userType === 'admin' ? 'Manager' : 'Seller'}</p>
            </div>
            <div class="receipt-items">
                ${items.map(item => `
                    <div class="item-row">
                        <span>${item.productName}</span>
                        <span>${item.primaryQty.toFixed(2)} ${item.primaryUnit}</span>
                        <span>${formatCurrency(item.totalPrice)}</span>
                    </div>
                    ${item.primaryUnit !== item.secondaryUnit ? `
                    <div class="item-detail">
                        (${item.quantityInSmallest.toFixed(2)} ${item.secondaryUnit} × ${formatCurrency(item.unitPrice)})
                    </div>` : ''}
                `).join('')}
            </div>
            <div class="receipt-totals">
                <div class="total-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
                ${discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatCurrency(discount)}</span></div>` : ''}
                <div class="total-row grand"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
            </div>
            <div class="receipt-footer">
                <p>THANK YOU!</p>
                <p>Karibu Tena 🛍️</p>
            </div>
        </div>
    `;
    
    document.getElementById('receiptContent').innerHTML = html;
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

console.log('✅ POS module loaded - Dual & Single unit support ready');
