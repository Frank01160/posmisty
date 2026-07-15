// ============================================
// ADMIN.JS - Admin Panel Logic
// Uses Data.js for all database operations
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
        showToast('Access denied', 'error');
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
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show matching panel
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            document.getElementById(tab + 'Panel').style.display = 'block';
        });
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
    catSelect.innerHTML = '<option value="">Select category</option>';
    App.categories.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    
    const unitSelect = document.getElementById('prodUnitPair');
    unitSelect.innerHTML = '<option value="">Select (optional)</option>';
    App.unitPairs.forEach(u => {
        unitSelect.innerHTML += `<option value="${u.id}">1 ${u.primaryUnit} = ${u.ratio} ${u.secondaryUnit}</option>`;
    });
}

// ============================================
// ========== UNIT PAIRS ==========
// ============================================

function renderUnits() {
    const tbody = document.getElementById('unitsBody');
    
    if (!App.unitPairs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">📏 No unit pairs yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.unitPairs.map(u => `
        <tr>
            <td><strong>${u.primaryUnit}</strong></td>
            <td>${u.secondaryUnit}</td>
            <td>1 = ${u.ratio}</td>
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
}

function updateUnitPreview() {
    document.getElementById('unitPrev1').textContent = document.getElementById('unitName1').value || '___';
    document.getElementById('unitPrev2').textContent = document.getElementById('unitName2').value || '___';
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
    
    if (!primary || !secondary) return showToast('Fill both unit names', 'error');
    if (!ratio || ratio <= 0) return showToast('Enter valid ratio', 'error');
    
    try {
        if (editUnitId) {
            await Data.updateUnitPair(editUnitId, { primaryUnit: primary, secondaryUnit: secondary, ratio });
            showToast('Unit pair updated!', 'success');
        } else {
            await Data.addUnitPair({ primaryUnit: primary, secondaryUnit: secondary, ratio });
            showToast('Unit pair added!', 'success');
        }
        hideUnitForm();
        await Data.getUnitPairs();
        renderUnits();
        updateProductSelects();
    } catch (err) {
        showToast('Error saving: ' + err.message, 'error');
    }
}

async function deleteUnit(id) {
    if (!confirm('Delete this unit pair?')) return;
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
    
    if (!App.categories.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">📂 No categories yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.categories.map(c => {
        const count = App.products.filter(p => p.categoryId === c.id).length;
        return `
            <tr>
                <td>📂 <strong>${c.name}</strong></td>
                <td>${count} products</td>
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
            showToast('Category updated!', 'success');
        } else {
            await Data.addCategory(name);
            showToast('Category added!', 'success');
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
    if (!confirm('Delete this category?')) return;
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
// ========== PRODUCTS ==========
// ============================================

function renderProducts() {
    const tbody = document.getElementById('productsBody');
    
    if (!App.products.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">📦 No products yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = App.products.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge-sm">${p.category || 'N/A'}</span></td>
            <td>${formatCurrency(p.sellingPrice)}</td>
            <td>${p.stock || 0}</td>
            <td>
                <button class="btn btn-sm btn-ghost" onclick="editProduct('${p.id}')">✏️</button>
                <button class="btn btn-sm btn-ghost text-red" onclick="deleteProduct('${p.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
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
    updateProductSelects();
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function hideProductForm() {
    document.getElementById('productForm').style.display = 'none';
    editProductId = null;
}

function editProduct(id) {
    const p = App.products.find(pr => pr.id === id);
    if (!p) return;
    
    editProductId = id;
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.categoryId || '';
    document.getElementById('prodUnitPair').value = p.unitPairId || '';
    document.getElementById('prodSellPrice').value = p.sellingPrice;
    document.getElementById('prodBuyPrice').value = p.buyingPrice || 0;
    document.getElementById('prodStock').value = p.stock;
    updateProductSelects();
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveProduct() {
    const name = document.getElementById('prodName').value.trim();
    let catId = document.getElementById('prodCategory').value;
    const newCat = document.getElementById('prodNewCategory').value.trim();
    const unitId = document.getElementById('prodUnitPair').value;
    const sellPrice = parseFloat(document.getElementById('prodSellPrice').value);
    const buyPrice = parseFloat(document.getElementById('prodBuyPrice').value) || 0;
    const stock = parseFloat(document.getElementById('prodStock').value) || 0;
    
    if (!name) return showToast('Product name required', 'error');
    if (!sellPrice || sellPrice <= 0) return showToast('Valid selling price required', 'error');
    
    // Create new category if typed
    if (newCat && !catId) {
        try {
            catId = await Data.addCategory(newCat);
            await Data.getCategories();
        } catch (err) {
            return showToast('Error creating category', 'error');
        }
    }
    
    const catName = App.categories.find(c => c.id === catId)?.name || newCat || 'Uncategorized';
    
    const productData = {
        name, categoryId: catId, category: catName,
        unitPairId: unitId,
        sellingPrice: sellPrice, buyingPrice: buyPrice, stock
    };
    
    try {
        if (editProductId) {
            await Data.updateProduct(editProductId, productData);
            showToast('Product updated!', 'success');
        } else {
            await Data.addProduct(productData);
            showToast('Product added!', 'success');
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
    if (!confirm('Delete this product?')) return;
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
    const s = await Data.getSettings();
    document.getElementById('setBizName').value = s.businessName || 'Amisty Company';
    document.getElementById('setAddress').value = s.businessAddress || '';
    document.getElementById('setPhone').value = s.businessPhone || '';
    document.getElementById('setManagerPIN').value = s.managerPIN || 'admin123';
    document.getElementById('setSellerPIN').value = s.sellerPIN || 'seller123';
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

console.log('✅ Admin module loaded');