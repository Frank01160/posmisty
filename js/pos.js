// ============================================
// POS MODULE
// ============================================


// ============================================
// INITIALIZE POS
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    // ✅ FIX: Show admin button if logged in as manager
    if (currentUserType === 'admin') {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            adminBtn.style.display = 'flex';
        }
    }
    
    await loadCategories();
    await loadUnitPairs();
    await loadProducts();
    
    // Add event listener for discount input
    const discountInput = document.getElementById('discountInput');
    if (discountInput) {
        discountInput.addEventListener('input', updateTotal);
    }
    
    // Refresh products every 30 seconds
    setInterval(loadProducts, 30000);
});


let products = [];
let basket = [];
let unitPairs = [];
let categories = [];
let currentProductForBasket = null;
let currentUnitRatio = 1;
let currentPrimaryUnit = '';
let currentSecondaryUnit = '';

// ============================================
// INITIALIZE POS
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    await loadCategories();
    await loadUnitPairs();
    await loadProducts();
    
    // Add event listener for discount input
    const discountInput = document.getElementById('discountInput');
    if (discountInput) {
        discountInput.addEventListener('input', updateTotal);
    }
    
    // Refresh products every 30 seconds
    setInterval(loadProducts, 30000);
});

// ============================================
// LOAD CATEGORIES
// ============================================
async function loadCategories() {
    try {
        const snapshot = await db.collection('categories').get();
        categories = [];
        const categoryFilter = document.getElementById('categoryFilter');
        
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        
        // Populate filter dropdown
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">📂 All Categories</option>';
            categories.forEach(cat => {
                categoryFilter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// ============================================
// LOAD UNIT PAIRS
// ============================================
async function loadUnitPairs() {
    try {
        const snapshot = await db.collection('unitPairs').get();
        unitPairs = [];
        snapshot.forEach(doc => {
            unitPairs.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error("Error loading unit pairs:", error);
    }
}

// ============================================
// LOAD PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        displayProducts(products);
    } catch (error) {
        console.error("Error loading products:", error);
        showToast('Error loading products', 'error');
    }
}

// ============================================
// DISPLAY PRODUCTS IN TABLE
// ============================================
function displayProducts(productList) {
    const tbody = document.getElementById('productsTableBody');
    
    if (productList.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">📦 No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = productList.map(product => {
        const stockClass = product.stock <= 0 ? 'stock-low' : 
                          product.stock < 10 ? 'stock-medium' : 'stock-good';
        
        const unitPair = unitPairs.find(up => up.id === product.unitPairId);
        let stockDisplay = '';
        
        if (unitPair) {
            const primaryQty = product.stock / unitPair.ratio;
            stockDisplay = `${product.stock.toFixed(1)} ${unitPair.secondaryUnit} (${primaryQty.toFixed(2)} ${unitPair.primaryUnit})`;
        } else {
            stockDisplay = `${product.stock}`;
        }
        
        return `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td><span class="category-badge">${product.category || 'N/A'}</span></td>
                <td class="${stockClass}">${stockDisplay}</td>
                <td>${formatCurrency(product.sellingPrice)}</td>
                <td>
                    <button class="btn-add-item" onclick="openAddToBasket('${product.id}')">
                        + Add
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// FILTER PRODUCTS
// ============================================
function filterProducts() {
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filtered = products;
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.categoryId === categoryFilter || p.category === categoryFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.category && p.category.toLowerCase().includes(searchTerm))
        );
    }
    
    displayProducts(filtered);
}

// ============================================
// OPEN ADD TO BASKET MODAL
// ============================================
function openAddToBasket(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock <= 0) {
        showToast('Product out of stock!', 'error');
        return;
    }
    
    currentProductForBasket = product;
    
    const unitPair = unitPairs.find(up => up.id === product.unitPairId);
    
    if (unitPair) {
        currentUnitRatio = unitPair.ratio;
        currentPrimaryUnit = unitPair.primaryUnit;
        currentSecondaryUnit = unitPair.secondaryUnit;
        
        document.getElementById('primaryUnitLabel').textContent = unitPair.primaryUnit;
        document.getElementById('secondaryUnitLabel').textContent = unitPair.secondaryUnit;
        document.getElementById('conversionInfo').textContent = 
            `1 ${unitPair.primaryUnit} = ${unitPair.ratio} ${unitPair.secondaryUnit}`;
    } else {
        currentUnitRatio = 1;
        currentPrimaryUnit = 'Units';
        currentSecondaryUnit = 'Units';
        
        document.getElementById('primaryUnitLabel').textContent = 'Quantity';
        document.getElementById('secondaryUnitLabel').textContent = 'Quantity';
        document.getElementById('conversionInfo').textContent = '';
    }
    
    document.getElementById('basketProductName').textContent = product.name;
    document.getElementById('primaryUnitInput').value = '';
    document.getElementById('secondaryUnitInput').value = '';
    
    document.getElementById('addToBasketModal').classList.add('active');
    setTimeout(() => document.getElementById('primaryUnitInput').focus(), 300);
}

// ============================================
// CONVERT UNITS IN REAL-TIME
// ============================================
function convertUnits(source) {
    const primaryInput = document.getElementById('primaryUnitInput');
    const secondaryInput = document.getElementById('secondaryUnitInput');
    
    if (source === 'primary') {
        const primaryValue = parseFloat(primaryInput.value) || 0;
        secondaryInput.value = (primaryValue * currentUnitRatio).toFixed(2);
    } else {
        const secondaryValue = parseFloat(secondaryInput.value) || 0;
        primaryInput.value = (secondaryValue / currentUnitRatio).toFixed(2);
    }
}

// ============================================
// ADD TO BASKET
// ============================================
function addToBasket() {
    if (!currentProductForBasket) return;
    
    const primaryInput = document.getElementById('primaryUnitInput');
    const secondaryInput = document.getElementById('secondaryUnitInput');
    
    const quantityInSmallest = parseFloat(secondaryInput.value) || 0;
    
    if (quantityInSmallest <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    if (quantityInSmallest > currentProductForBasket.stock) {
        showToast('Insufficient stock!', 'error');
        return;
    }
    
    // Check if product already in basket
    const existingIndex = basket.findIndex(item => item.productId === currentProductForBasket.id);
    
    if (existingIndex >= 0) {
        basket[existingIndex].quantityInSmallest += quantityInSmallest;
        basket[existingIndex].primaryQty = parseFloat(primaryInput.value) || 0;
    } else {
        basket.push({
            productId: currentProductForBasket.id,
            productName: currentProductForBasket.name,
            sellingPrice: currentProductForBasket.sellingPrice,
            buyingPrice: currentProductForBasket.buyingPrice || 0,
            quantityInSmallest: quantityInSmallest,
            primaryQty: parseFloat(primaryInput.value) || 0,
            unitRatio: currentUnitRatio,
            primaryUnit: currentPrimaryUnit,
            secondaryUnit: currentSecondaryUnit,
            maxStock: currentProductForBasket.stock
        });
    }
    
    updateBasketDisplay();
    closeBasketModal();
    showToast('Added to basket ✓', 'success');
}

// ============================================
// UPDATE BASKET DISPLAY
// ============================================
function updateBasketDisplay() {
    const basketContainer = document.getElementById('basketItems');
    
    if (basket.length === 0) {
        basketContainer.innerHTML = `
            <div class="empty-basket">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-cart-icon">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>Basket is empty</p>
                <span>Add products from the list</span>
            </div>
        `;
    } else {
        basketContainer.innerHTML = basket.map((item, index) => {
            const itemTotal = item.quantityInSmallest * item.sellingPrice;
            return `
                <div class="basket-item">
                    <div class="basket-item-info">
                        <div class="basket-item-name">${item.productName}</div>
                        <div class="basket-item-unit">
                            ${item.primaryQty.toFixed(2)} ${item.primaryUnit} 
                            (${item.quantityInSmallest.toFixed(2)} ${item.secondaryUnit})
                        </div>
                    </div>
                    <div class="basket-item-qty">
                        <button onclick="adjustBasketQty(${index}, -1)">-</button>
                        <span>${item.primaryQty.toFixed(1)}</span>
                        <button onclick="adjustBasketQty(${index}, 1)">+</button>
                    </div>
                    <div class="basket-item-price">${formatCurrency(itemTotal)}</div>
                    <button class="btn-remove-item" onclick="removeFromBasket(${index})">✕</button>
                </div>
            `;
        }).join('');
    }
    
    updateTotal();
}

// ============================================
// ADJUST BASKET QUANTITY
// ============================================
function adjustBasketQty(index, change) {
    const item = basket[index];
    const adjustment = change * item.unitRatio;
    const newQty = item.quantityInSmallest + adjustment;
    
    if (newQty <= 0) {
        removeFromBasket(index);
        return;
    }
    
    if (newQty > item.maxStock) {
        showToast('Cannot exceed available stock!', 'error');
        return;
    }
    
    item.quantityInSmallest = newQty;
    item.primaryQty = newQty / item.unitRatio;
    updateBasketDisplay();
}

// ============================================
// REMOVE FROM BASKET
// ============================================
function removeFromBasket(index) {
    basket.splice(index, 1);
    updateBasketDisplay();
}

// ============================================
// CLEAR BASKET
// ============================================
function clearBasket() {
    if (basket.length === 0) return;
    if (confirm('Are you sure you want to clear the basket?')) {
        basket = [];
        updateBasketDisplay();
    }
}

// ============================================
// UPDATE TOTAL
// ============================================
function updateTotal() {
    const subtotal = basket.reduce((sum, item) => {
        return sum + (item.quantityInSmallest * item.sellingPrice);
    }, 0);
    
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
    document.getElementById('totalBtnAmount').textContent = formatCurrency(total);
}

// ============================================
// COMPLETE SALE
// ============================================
async function completeSale() {
    if (basket.length === 0) {
        showToast('Basket is empty!', 'error');
        return;
    }
    
    const subtotal = basket.reduce((sum, item) => {
        return sum + (item.quantityInSmallest * item.sellingPrice);
    }, 0);
    
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    if (!confirm(`Complete sale for ${formatCurrency(total)}?`)) return;
    
    const completeBtn = document.querySelector('.btn-complete-sale');
    completeBtn.disabled = true;
    completeBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:3px;"></div> Processing...';
    
    try {
        const batch = db.batch();
        const saleItems = [];
        
        // Update stock for each product
        for (const item of basket) {
            const productRef = db.collection('products').doc(item.productId);
            const product = products.find(p => p.id === item.productId);
            
            if (!product) continue;
            
            const newStock = product.stock - item.quantityInSmallest;
            
            batch.update(productRef, {
                stock: newStock,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Add to stock history
            const historyRef = db.collection('stockHistory').doc();
            batch.set(historyRef, {
                productId: item.productId,
                productName: item.productName,
                category: product.category || '',
                changeType: 'sale',
                quantityChange: -item.quantityInSmallest,
                reason: 'Sale transaction',
                doneBy: currentUserType,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            saleItems.push({
                productName: item.productName,
                quantityInSmallest: item.quantityInSmallest,
                primaryQty: item.primaryQty,
                primaryUnit: item.primaryUnit,
                secondaryUnit: item.secondaryUnit,
                unitPrice: item.sellingPrice,
                totalPrice: item.quantityInSmallest * item.sellingPrice,
                profit: (item.sellingPrice - item.buyingPrice) * item.quantityInSmallest
            });
        }
        
        // Save sale record
        const saleRef = db.collection('sales').doc();
        batch.set(saleRef, {
            items: saleItems,
            subtotal: subtotal,
            discount: discount,
            total: total,
            totalProfit: saleItems.reduce((sum, item) => sum + item.profit, 0),
            soldBy: currentUserType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        
        // Generate receipt
        generateReceipt(saleItems, subtotal, discount, total);
        
        // Clear basket
        basket = [];
        document.getElementById('discountInput').value = '';
        updateBasketDisplay();
        
        // Reload products
        await loadProducts();
        
        showToast('Sale completed successfully! ✓', 'success');
        
    } catch (error) {
        console.error("Error completing sale:", error);
        showToast('Error processing sale. Please try again.', 'error');
    } finally {
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<span>Complete Sale</span><span id="totalBtnAmount">' + formatCurrency(0) + '</span>';
    }
}

// ============================================
// GENERATE THERMAL RECEIPT
// ============================================
async function generateReceipt(items, subtotal, discount, total) {
    const settings = await getSettings();
    const now = new Date();
    
    const receiptHTML = `
        <div class="thermal-receipt">
            <div class="receipt-header">
                <h2>${settings.businessName || 'Amisty Company'}</h2>
                <p>${settings.businessAddress || ''}</p>
                <p>Tel: ${settings.businessPhone || ''}</p>
            </div>
            <div class="receipt-info">
                <p>Date: ${now.toLocaleDateString('en-KE')}</p>
                <p>Time: ${now.toLocaleTimeString('en-KE')}</p>
                <p>Seller: ${currentUserType === 'admin' ? 'Manager' : 'Seller'}</p>
            </div>
            <div class="receipt-items">
                ${items.map(item => `
                    <div class="item-row">
                        <span class="item-name">${item.productName}</span>
                        <span class="item-qty">${item.primaryQty.toFixed(2)} ${item.primaryUnit}</span>
                        <span class="item-price">${formatCurrency(item.totalPrice)}</span>
                    </div>
                    <div class="item-row" style="font-size:10px;color:#666;">
                        <span></span>
                        <span>(${item.quantityInSmallest.toFixed(2)} ${item.secondaryUnit} x ${formatCurrency(item.unitPrice)})</span>
                    </div>
                `).join('')}
            </div>
            <div class="receipt-totals">
                <div class="total-row">
                    <span>SUBTOTAL:</span>
                    <span>${formatCurrency(subtotal)}</span>
                </div>
                ${discount > 0 ? `
                <div class="total-row discount">
                    <span>DISCOUNT:</span>
                    <span>-${formatCurrency(discount)}</span>
                </div>` : ''}
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>${formatCurrency(total)}</span>
                </div>
            </div>
            <div class="receipt-footer">
                <p>THANK YOU!</p>
                <p>Karibu Tena</p>
                <p>${settings.businessName || 'Amisty Company'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptModal').classList.add('active');
}

// ============================================
// PRINT RECEIPT
// ============================================
function printReceipt() {
    window.print();
}

// ============================================
// CLOSE MODALS
// ============================================
function closeBasketModal() {
    document.getElementById('addToBasketModal').classList.remove('active');
    currentProductForBasket = null;
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
}

// Close modals on outside click
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});
