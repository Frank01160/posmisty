// ============================================
// ADMIN.JS - Admin Panel Logic (REWRITTEN)
// Uses Data.js for all database operations
// Dual stock input system for unit pairs
// ============================================

let editUnitId = null;
let editCategoryId = null;
let editProductId = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    // Manager only
    if (App.userType !== 'admin') {
        showToast('Access denied - Manager only', 'error');
        setTimeout(() => window.location.href = 'pos.html', 1500);
        return;
    }
    
    setupTabs();
    await loadAllData();
    await loadSettingsForm();
});

// ============================================
// TAB NAVIGATION
// ============================================
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Update active states
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show matching panel
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            document.getElementById(tab + 'Panel').style.display = 'block';
            
            // Hide all forms when switching tabs
            hideAllForms();
        });
    });
}

function hideAllForms() {
    const forms = ['unitForm', 'categoryForm', 'productForm'];
    forms.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ============================================
// LOAD ALL DATA
// ============================================
async function loadAllData() {
    try {
        await Data.getUnitPairs();
        await Data.getCategories();
        await Data.getProducts();
        
        renderUnits();
        renderCategories();
        renderProducts();
        updateProductSelects();
    } catch (err) {
        console.error('Load error:', err);
        showToast('Error loading data', 'error');
    }
}

// ============================================
// UPDATE PRODUCT FORM SELECTS
// ============================================
function updateProductSelects() {
    const catSelect = document.getElementById('prodCategory');
    if (catSelect) {
        catSelect.innerHTML = '<option value="">Select category</option>';
        App.categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
    
    const unitSelect = document.getElementById('prodUnitPair');
    if (unitSelect) {
        unitSelect.innerHTML = '<option value="">None - Single Unit (e.g., Laptop, Phone)</option>';
        App.unitPairs.forEach(u => {
            unitSelect.innerHTML += `<option value="${u.id}">${u.primaryUnit} ↔ ${u.secondaryUnit} (1:${u.ratio})</option>`;
        });
    }
}

// ============================================
// ========== UNIT PAIRS ==========
// ============================================

function renderUnits() {
    const tbody = document.getElementById('unitsBody');
    if (!tbody) return;
    
    if (!App.unitPairs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">📏 No unit pairs yet. Click "+ Add Pair" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.unitPairs.map(u => `
        <tr>
            <td><strong>${u.primaryUnit}</strong></td>
            <td>${u.secondaryUnit}</td>
            <td>1 ${u.primaryUnit} = ${u.ratio} ${u.secondaryUnit}</td>
            <td>
                <button class="btn btn-sm btn-ghost" onclick="editUnit('${u.id}')">✏️</button>
                <button class="btn btn-sm btn-ghost text-red" onclick="deleteUnit('${u.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function showUnitForm() {
    editUnitId = null;
    document.getElementById('unitForm').style.display = 'block';
    document.getElementById('unitName1').value = '';
    document.getElementById('unitName2').value = '';
    document.getElementById('unitRatio').value = '';
    updateUnitPreview();
    document.getElementById('unitName1').oninput = updateUnitPreview;
    document.getElementById('unitName2').oninput = updateUnitPreview;
    document.getElementById('unitForm').scrollIntoView({ behavior: 'smooth' });
}

function updateUnitPreview() {
    const n1 = document.getElementById('unitName1').value || '___';
    const n2 = document.getElementById('unitName2').value || '___';
    document.getElementById('unitPrev1').textContent = n1;
    document.getElementById('unitPrev2').textContent = n2;
}

function hideUnitForm() {
    document.getElementById('unitForm').style.display = 'none';
    editUnitId = null;
}

function editUnit(id) {
    const unit = App.unitPairs.find(u => u.id === id);
    if (!unit) return;
    
    editUnitId = id;
    document.getElementById('unitForm').style.display = 'block';
    document.getElementById('unitName1').value = unit.primaryUnit;
    document.getElementById('unitName2').value = unit.secondaryUnit;
    document.getElementById('unitRatio').value = unit.ratio;
    updateUnitPreview();
    document.getElementById('unitForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveUnit() {
    const primary = document.getElementById('unitName1').value.trim();
    const secondary = document.getElementById('unitName2').value.trim();
    const ratio = parseFloat(document.getElementById('unitRatio').value);
    
    if (!primary) return showToast('Enter primary unit name (e.g., Ngunia)', 'error');
    if (!secondary) return showToast('Enter secondary unit name (e.g., Kg)', 'error');
    if (!ratio || ratio <= 0) return showToast('Enter valid conversion ratio', 'error');
    
    try {
        if (editUnitId) {
            await Data.updateUnitPair(editUnitId, { primaryUnit: primary, secondaryUnit: secondary, ratio });
            showToast('✅ Unit pair updated!', 'success');
        } else {
            await Data.addUnitPair({ primaryUnit: primary, secondaryUnit: secondary, ratio });
            showToast('✅ Unit pair added!', 'success');
        }
        hideUnitForm();
        await Data.getUnitPairs();
        renderUnits();
        updateProductSelects();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function deleteUnit(id) {
    if (!confirm('Delete this unit pair? Products using it will be affected.')) return;
    try {
        await Data.deleteUnitPair(id);
        await Data.getUnitPairs();
        renderUnits();
        updateProductSelects();
        showToast('Deleted', 'success');
    } catch (err) {
        showToast('Error deleting', 'error');
    }
}

// ============================================
// ========== CATEGORIES ==========
// ============================================

function renderCategories() {
    const tbody = document.getElementById('categoriesBody');
    if (!tbody) return;
    
    if (!App.categories.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">📂 No categories yet. Click "+ Add Category" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.categories.map(c => {
        const count = App.products.filter(p => p.categoryId === c.id).length;
        return `
            <tr>
                <td>📂 <strong>${c.name}</strong></td>
                <td>${count} product${count !== 1 ? 's' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-ghost" onclick="editCategory('${c.id}')">✏️</button>
                    <button class="btn btn-sm btn-ghost text-red" onclick="deleteCategory('${c.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showCategoryForm() {
    editCategoryId = null;
    document.getElementById('categoryForm').style.display = 'block';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
}

function hideCategoryForm() {
    document.getElementById('categoryForm').style.display = 'none';
    editCategoryId = null;
}

function editCategory(id) {
    const cat = App.categories.find(c => c.id === id);
    if (!cat) return;
    
    editCategoryId = id;
    document.getElementById('categoryForm').style.display = 'block';
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return showToast('Enter category name', 'error');
    
    try {
        if (editCategoryId) {
            await Data.updateCategory(editCategoryId, name);
            showToast('✅ Category updated!', 'success');
        } else {
            await Data.addCategory(name);
            showToast('✅ Category added!', 'success');
        }
        hideCategoryForm();
        await Data.getCategories();
        renderCategories();
        updateProductSelects();
    } catch (err) {
        showToast('Error saving', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? Products will become uncategorized.')) return;
    try {
        await Data.deleteCategory(id);
        await Data.getCategories();
        renderCategories();
        updateProductSelects();
        showToast('Deleted', 'success');
    } catch (err) {
        showToast('Error deleting', 'error');
    }
}

// ============================================
// ========== PRODUCTS (WITH DUAL STOCK) ==========
// ============================================

function renderProducts() {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;
    
    if (!App.products.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">📦 No products yet. Click "+ Add Product" to add one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.products.map(p => {
        const unitPair = App.unitPairs.find(u => u.id === p.unitPairId);
        let stockDisplay = p.stock || 0;
        let priceDisplay = formatCurrency(p.sellingPrice);
        
        if (unitPair) {
            const primaryStock = (p.stock / unitPair.ratio).toFixed(2);
            stockDisplay = `${primaryStock} ${unitPair.primaryUnit} / ${p.stock} ${unitPair.secondaryUnit}`;
            priceDisplay = `${formatCurrency(p.sellingPrice)} / ${unitPair.secondaryUnit}`;
        } else {
            priceDisplay = `${formatCurrency(p.sellingPrice)} / unit`;
        }
        
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge-sm">${p.category || 'N/A'}</span></td>
                <td>${priceDisplay}</td>
                <td>${stockDisplay}</td>
                <td>
                    <button class="btn btn-sm btn-ghost" onclick="editProduct('${p.id}')">✏️</button>
                    <button class="btn btn-sm btn-ghost text-red" onclick="deleteProduct('${p.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showProductForm() {
    editProductId = null;
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('prodName').value = '';
    document.getElementById('prodCategory').value = '';
    document.getElementById('prodNewCategory').value = '';
    document.getElementById('prodUnitPair').value = '';
    document.getElementById('prodSellPrice').value = '';
    document.getElementById('prodBuyPrice').value = '';
    document.getElementById('prodStock').value = '';
    document.getElementById('prodStockPrimary').value = '';
    
    // Reset to single stock mode
    showSingleStockMode();
    
    updateProductSelects();
    setupUnitPairListener();
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function hideProductForm() {
    document.getElementById('productForm').style.display = 'none';
    editProductId = null;
}

// Show single stock input (no unit pair)
function showSingleStockMode() {
    document.getElementById('dualStockInputs').style.display = 'none';
    document.getElementById('singleStockInput').style.display = 'grid';
    document.getElementById('priceLabel').textContent = 'Selling Price per Unit (Ksh) *';
    document.getElementById('buyPriceLabel').textContent = 'Buying Price per Unit (Ksh)';
    document.getElementById('prodUnitPair').dataset.ratio = '1';
}

// Show dual stock inputs (unit pair selected)
function showDualStockMode(unitPair) {
    document.getElementById('dualStockInputs').style.display = 'grid';
    document.getElementById('singleStockInput').style.display = 'none';
    document.getElementById('stockLabel1').textContent = `Stock in ${unitPair.primaryUnit}`;
    document.getElementById('stockLabel2').textContent = `Stock in ${unitPair.secondaryUnit}`;
    document.getElementById('conversionText').textContent = 
        `📐 1 ${unitPair.primaryUnit} = ${unitPair.ratio} ${unitPair.secondaryUnit}`;
    document.getElementById('priceLabel').textContent = `Selling Price per ${unitPair.secondaryUnit} (Ksh) *`;
    document.getElementById('buyPriceLabel').textContent = `Buying Price per ${unitPair.secondaryUnit} (Ksh)`;
    document.getElementById('prodUnitPair').dataset.ratio = unitPair.ratio;
}

// Handle unit pair selection change
function onUnitPairChange() {
    const unitId = document.getElementById('prodUnitPair').value;
    
    if (unitId) {
        const unitPair = App.unitPairs.find(u => u.id === unitId);
        if (unitPair) {
            showDualStockMode(unitPair);
        }
    } else {
        showSingleStockMode();
    }
}

// Setup listener for unit pair dropdown
function setupUnitPairListener() {
    const select = document.getElementById('prodUnitPair');
    // Remove old listener
    select.removeEventListener('change', onUnitPairChange);
    // Add new listener
    select.addEventListener('change', onUnitPairChange);
}

// Convert stock between primary and secondary units
function convertStock(source) {
    const ratio = parseFloat(document.getElementById('prodUnitPair').dataset.ratio) || 1;
    const primaryInput = document.getElementById('prodStockPrimary');
    const secondaryInput = document.getElementById('prodStock');
    
    if (source === 'primary') {
        const primaryVal = parseFloat(primaryInput.value) || 0;
        secondaryInput.value = (primaryVal * ratio).toFixed(2);
    } else {
        const secondaryVal = parseFloat(secondaryInput.value) || 0;
        primaryInput.value = (secondaryVal / ratio).toFixed(2);
    }
}

function editProduct(id) {
    const p = App.products.find(pr => pr.id === id);
    if (!p) return;
    
    editProductId = id;
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.categoryId || '';
    document.getElementById('prodNewCategory').value = '';
    document.getElementById('prodUnitPair').value = p.unitPairId || '';
    document.getElementById('prodSellPrice').value = p.sellingPrice;
    document.getElementById('prodBuyPrice').value = p.buyingPrice || 0;
    
    if (p.unitPairId) {
        const unitPair = App.unitPairs.find(u => u.id === p.unitPairId);
        if (unitPair) {
            showDualStockMode(unitPair);
            document.getElementById('prodStock').value = p.stock;
            document.getElementById('prodStockPrimary').value = (p.stock / unitPair.ratio).toFixed(2);
        }
    } else {
        showSingleStockMode();
        document.getElementById('prodStock').value = p.stock;
    }
    
    updateProductSelects();
    setupUnitPairListener();
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveProduct() {
    const name = document.getElementById('prodName').value.trim();
    let catId = document.getElementById('prodCategory').value;
    const newCat = document.getElementById('prodNewCategory').value.trim();
    const unitId = document.getElementById('prodUnitPair').value;
    const sellPrice = parseFloat(document.getElementById('prodSellPrice').value);
    const buyPrice = parseFloat(document.getElementById('prodBuyPrice').value) || 0;
    
    // Get stock from the correct input
    let stock;
    if (unitId) {
        // Dual mode - stock is in secondary (smallest) unit
        stock = parseFloat(document.getElementById('prodStock').value) || 0;
    } else {
        // Single mode
        stock = parseFloat(document.getElementById('prodStock').value) || 0;
    }
    
    if (!name) return showToast('Product name is required', 'error');
    if (!sellPrice || sellPrice <= 0) return showToast('Valid selling price is required', 'error');
    
    // Create new category if typed
    if (newCat && !catId) {
        try {
            catId = await Data.addCategory(newCat);
            await Data.getCategories();
            updateProductSelects();
        } catch (err) {
            return showToast('Error creating category', 'error');
        }
    }
    
    const catName = App.categories.find(c => c.id === catId)?.name || newCat || 'Uncategorized';
    
    const productData = {
        name: name,
        categoryId: catId || null,
        category: catName,
        unitPairId: unitId || null,
        sellingPrice: sellPrice,
        buyingPrice: buyPrice,
        stock: stock
    };
    
    try {
        if (editProductId) {
            await Data.updateProduct(editProductId, productData);
            showToast('✅ Product updated!', 'success');
        } else {
            await Data.addProduct(productData);
            showToast('✅ Product added!', 'success');
        }
        hideProductForm();
        await Data.getProducts();
        renderProducts();
        updateProductSelects();
    } catch (err) {
        showToast('Error saving: ' + err.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
        await Data.deleteProduct(id);
        await Data.getProducts();
        renderProducts();
        showToast('Deleted', 'success');
    } catch (err) {
        showToast('Error deleting', 'error');
    }
}

// ============================================
// ========== SETTINGS ==========
// ============================================

async function loadSettingsForm() {
    try {
        const s = await Data.getSettings();
        document.getElementById('setBizName').value = s.businessName || 'Amisty Company';
        document.getElementById('setAddress').value = s.businessAddress || '';
        document.getElementById('setPhone').value = s.businessPhone || '';
        document.getElementById('setManagerPIN').value = s.managerPIN || 'admin123';
        document.getElementById('setSellerPIN').value = s.sellerPIN || 'seller123';
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

async function saveSettings() {
    const data = {
        businessName: document.getElementById('setBizName').value.trim(),
        businessAddress: document.getElementById('setAddress').value.trim(),
        businessPhone: document.getElementById('setPhone').value.trim(),
        managerPIN: document.getElementById('setManagerPIN').value.trim(),
        sellerPIN: document.getElementById('setSellerPIN').value.trim()
    };
    
    if (!data.managerPIN || !data.sellerPIN) {
        return showToast('PINs cannot be empty', 'error');
    }
    
    try {
        await Data.saveSettings(data);
        showToast('✅ Settings saved!', 'success');
    } catch (err) {
        showToast('Error saving settings', 'error');
    }
}

console.log('✅ Admin module loaded - Dual stock system ready');
