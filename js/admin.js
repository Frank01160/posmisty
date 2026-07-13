// ============================================
// ADMIN PANEL MODULE
// ============================================

let allUnitPairs = [];
let allCategories = [];
let allProducts = [];
let editingUnitId = null;
let editingCategoryId = null;
let editingProductId = null;

// ============================================
// INITIALIZE ADMIN PANEL
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    // Only managers can access
    if (currentUserType !== 'admin') {
        showToast('Access denied. Manager only!', 'error');
        setTimeout(() => window.location.href = 'pos.html', 2000);
        return;
    }
    
    await loadAllData();
    showSection('units'); // Default section
    
    // Load settings
    await loadSettings();
});

// ============================================
// LOAD ALL DATA
// ============================================
async function loadAllData() {
    await loadUnitPairs();
    await loadCategories();
    await loadProducts();
}

// ============================================
// LOAD UNIT PAIRS
// ============================================
async function loadUnitPairs() {
    try {
        const snapshot = await db.collection('unitPairs').get();
        allUnitPairs = [];
        snapshot.forEach(doc => {
            allUnitPairs.push({ id: doc.id, ...doc.data() });
        });
        displayUnitPairs();
    } catch (error) {
        console.error("Error loading unit pairs:", error);
    }
}

// ============================================
// DISPLAY UNIT PAIRS
// ============================================
function displayUnitPairs() {
    const tbody = document.getElementById('unitsTableBody');
    
    if (allUnitPairs.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No unit pairs defined yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = allUnitPairs.map(up => `
        <tr>
            <td><strong>${up.primaryUnit}</strong></td>
            <td><strong>${up.secondaryUnit}</strong></td>
            <td>1 ${up.primaryUnit} = ${up.ratio} ${up.secondaryUnit}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="editUnitPair('${up.id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteUnitPair('${up.id}')">🗑️ Delete</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// SHOW/HIDE SECTIONS
// ============================================
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    
    // Show selected section
    document.getElementById(section + 'Section').style.display = 'block';
    
    // Update sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.sidebar-btn').classList.add('active');
    
    // Hide all forms
    hideAllForms();
}

// ============================================
// HIDE ALL FORMS
// ============================================
function hideAllForms() {
    const forms = ['addUnitForm', 'addCategoryForm', 'addProductForm'];
    forms.forEach(id => {
        const form = document.getElementById(id);
        if (form) form.style.display = 'none';
    });
}

// ============================================
// UNIT PAIRS - SHOW FORM
// ============================================
function showAddUnitForm() {
    editingUnitId = null;
    document.getElementById('addUnitForm').style.display = 'block';
    document.getElementById('unitName1').value = '';
    document.getElementById('unitName2').value = '';
    document.getElementById('unitRatio').value = '';
    
    // Update preview as user types
    document.getElementById('unitName1').addEventListener('input', updateUnitPreview);
    document.getElementById('unitName2').addEventListener('input', updateUnitPreview);
    updateUnitPreview();
}

function hideAddUnitForm() {
    document.getElementById('addUnitForm').style.display = 'none';
    editingUnitId = null;
}

function updateUnitPreview() {
    const name1 = document.getElementById('unitName1').value || '_____';
    const name2 = document.getElementById('unitName2').value || '_____';
    document.getElementById('unitPreview1').textContent = name1;
    document.getElementById('unitPreview2').textContent = name2;
}

// ============================================
// ADD UNIT PAIR
// ============================================
async function addUnitPair() {
    const primaryUnit = document.getElementById('unitName1').value.trim();
    const secondaryUnit = document.getElementById('unitName2').value.trim();
    const ratio = parseFloat(document.getElementById('unitRatio').value);
    
    if (!primaryUnit || !secondaryUnit) {
        showToast('Please fill in both unit names', 'error');
        return;
    }
    
    if (!ratio || ratio <= 0) {
        showToast('Please enter a valid ratio', 'error');
        return;
    }
    
    try {
        if (editingUnitId) {
            // Update existing
            await db.collection('unitPairs').doc(editingUnitId).update({
                primaryUnit,
                secondaryUnit,
                ratio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Unit pair updated! ✓', 'success');
        } else {
            // Add new
            await db.collection('unitPairs').add({
                primaryUnit,
                secondaryUnit,
                ratio,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Unit pair added! ✓', 'success');
        }
        
        hideAddUnitForm();
        await loadUnitPairs();
    } catch (error) {
        console.error("Error saving unit pair:", error);
        showToast('Error saving unit pair', 'error');
    }
}

// ============================================
// EDIT UNIT PAIR
// ============================================
function editUnitPair(id) {
    const unitPair = allUnitPairs.find(up => up.id === id);
    if (!unitPair) return;
    
    editingUnitId = id;
    document.getElementById('addUnitForm').style.display = 'block';
    document.getElementById('unitName1').value = unitPair.primaryUnit;
    document.getElementById('unitName2').value = unitPair.secondaryUnit;
    document.getElementById('unitRatio').value = unitPair.ratio;
    updateUnitPreview();
    
    // Scroll to form
    document.getElementById('addUnitForm').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// DELETE UNIT PAIR
// ============================================
async function deleteUnitPair(id) {
    if (!confirm('Delete this unit pair? Products using it will be affected.')) return;
    
    try {
        await db.collection('unitPairs').doc(id).delete();
        showToast('Unit pair deleted', 'success');
        await loadUnitPairs();
    } catch (error) {
        console.error("Error deleting unit pair:", error);
        showToast('Error deleting unit pair', 'error');
    }
}

// ============================================
// LOAD CATEGORIES
// ============================================
async function loadCategories() {
    try {
        const snapshot = await db.collection('categories').get();
        allCategories = [];
        snapshot.forEach(doc => {
            allCategories.push({ id: doc.id, ...doc.data() });
        });
        displayCategories();
        updateCategorySelects();
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// ============================================
// DISPLAY CATEGORIES
// ============================================
function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (allCategories.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No categories defined yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = allCategories.map(cat => {
        const productCount = allProducts.filter(p => p.categoryId === cat.id).length;
        return `
            <tr>
                <td>📂 ${cat.name}</td>
                <td>${productCount} products</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="editCategory('${cat.id}')">✏️ Edit</button>
                    <button class="btn-delete" onclick="deleteCategory('${cat.id}')">🗑️ Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// SHOW ADD CATEGORY FORM
// ============================================
function showAddCategoryForm() {
    editingCategoryId = null;
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('categoryName').value = '';
}

function hideAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'none';
    editingCategoryId = null;
}

// ============================================
// ADD CATEGORY
// ============================================
async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    
    if (!name) {
        showToast('Please enter a category name', 'error');
        return;
    }
    
    try {
        if (editingCategoryId) {
            await db.collection('categories').doc(editingCategoryId).update({
                name,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Category updated! ✓', 'success');
        } else {
            await db.collection('categories').add({
                name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Category added! ✓', 'success');
        }
        
        hideAddCategoryForm();
        await loadCategories();
    } catch (error) {
        console.error("Error saving category:", error);
        showToast('Error saving category', 'error');
    }
}

// ============================================
// EDIT CATEGORY
// ============================================
function editCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    
    editingCategoryId = id;
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('addCategoryForm').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// DELETE CATEGORY
// ============================================
async function deleteCategory(id) {
    if (!confirm('Delete this category? Products in this category will become uncategorized.')) return;
    
    try {
        await db.collection('categories').doc(id).delete();
        showToast('Category deleted', 'success');
        await loadCategories();
    } catch (error) {
        console.error("Error deleting category:", error);
        showToast('Error deleting category', 'error');
    }
}

// ============================================
// UPDATE CATEGORY SELECTS
// ============================================
function updateCategorySelects() {
    const selects = ['productCategory'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select category</option>';
            allCategories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    });
    
    // Also update unit pair select
    const unitSelect = document.getElementById('productUnitPair');
    if (unitSelect) {
        unitSelect.innerHTML = '<option value="">Select unit pair</option>';
        allUnitPairs.forEach(up => {
            unitSelect.innerHTML += `<option value="${up.id}">1 ${up.primaryUnit} = ${up.ratio} ${up.secondaryUnit}</option>`;
        });
    }
}

// ============================================
// LOAD PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        allProducts = [];
        snapshot.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });
        displayProductsAdmin();
        updateCategorySelects();
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// ============================================
// DISPLAY PRODUCTS (ADMIN VIEW)
// ============================================
function displayProductsAdmin() {
    const tbody = document.getElementById('productsTableBody');
    
    if (allProducts.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No products added yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = allProducts.map(product => {
        const category = allCategories.find(c => c.id === product.categoryId);
        const unitPair = allUnitPairs.find(up => up.id === product.unitPairId);
        let unitDisplay = 'N/A';
        
        if (unitPair) {
            unitDisplay = `${unitPair.primaryUnit} ↔ ${unitPair.secondaryUnit}`;
        }
        
        return `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td>${category ? category.name : 'N/A'}</td>
                <td>${unitDisplay}</td>
                <td>${formatCurrency(product.sellingPrice)}</td>
                <td>${formatCurrency(product.buyingPrice || 0)}</td>
                <td>${product.stock || 0}</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="editProduct('${product.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteProduct('${product.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// SHOW ADD PRODUCT FORM
// ============================================
function showAddProductForm() {
    editingProductId = null;
    document.getElementById('addProductForm').style.display = 'block';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('newCategoryInput').value = '';
    document.getElementById('productUnitPair').value = '';
    document.getElementById('sellingPrice').value = '';
    document.getElementById('buyingPrice').value = '';
    document.getElementById('initialStock').value = '';
    updateCategorySelects();
    document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
}

function hideAddProductForm() {
    document.getElementById('addProductForm').style.display = 'none';
    editingProductId = null;
}

// ============================================
// ADD PRODUCT
// ============================================
async function addProduct() {
    const name = document.getElementById('productName').value.trim();
    let categoryId = document.getElementById('productCategory').value;
    const newCategory = document.getElementById('newCategoryInput').value.trim();
    const unitPairId = document.getElementById('productUnitPair').value;
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    const buyingPrice = parseFloat(document.getElementById('buyingPrice').value);
    const stock = parseFloat(document.getElementById('initialStock').value);
    
    if (!name) { showToast('Product name required', 'error'); return; }
    if (!sellingPrice || sellingPrice <= 0) { showToast('Valid selling price required', 'error'); return; }
    if (!buyingPrice || buyingPrice < 0) { showToast('Valid buying price required', 'error'); return; }
    if (isNaN(stock) || stock < 0) { showToast('Valid stock quantity required', 'error'); return; }
    
    // Handle new category
    if (newCategory && !categoryId) {
        try {
            const catRef = await db.collection('categories').add({
                name: newCategory,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            categoryId = catRef.id;
            await loadCategories();
        } catch (error) {
            showToast('Error creating category', 'error');
            return;
        }
    }
    
    if (!categoryId) {
        showToast('Please select or create a category', 'error');
        return;
    }
    
    const productData = {
        name,
        categoryId,
        category: allCategories.find(c => c.id === categoryId)?.name || newCategory,
        unitPairId: unitPairId || null,
        sellingPrice,
        buyingPrice,
        stock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingProductId) {
            await db.collection('products').doc(editingProductId).update(productData);
            
            // Add stock change history
            const oldProduct = allProducts.find(p => p.id === editingProductId);
            if (oldProduct && oldProduct.stock !== stock) {
                await db.collection('stockHistory').add({
                    productId: editingProductId,
                    productName: name,
                    category: productData.category,
                    changeType: 'adjustment',
                    quantityChange: stock - oldProduct.stock,
                    reason: 'Stock updated by manager',
                    doneBy: 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            showToast('Product updated! ✓', 'success');
        } else {
            const docRef = await db.collection('products').add({
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Add initial stock history
            if (stock > 0) {
                await db.collection('stockHistory').add({
                    productId: docRef.id,
                    productName: name,
                    category: productData.category,
                    changeType: 'add',
                    quantityChange: stock,
                    reason: 'Initial stock',
                    doneBy: 'admin',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            showToast('Product added! ✓', 'success');
        }
        
        hideAddProductForm();
        await loadProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        showToast('Error saving product', 'error');
    }
}

// ============================================
// EDIT PRODUCT
// ============================================
function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    editingProductId = id;
    document.getElementById('addProductForm').style.display = 'block';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.categoryId || '';
    document.getElementById('newCategoryInput').value = '';
    document.getElementById('productUnitPair').value = product.unitPairId || '';
    document.getElementById('sellingPrice').value = product.sellingPrice;
    document.getElementById('buyingPrice').value = product.buyingPrice || 0;
    document.getElementById('initialStock').value = product.stock;
    updateCategorySelects();
    document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// DELETE PRODUCT
// ============================================
async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    
    try {
        await db.collection('products').doc(id).delete();
        showToast('Product deleted', 'success');
        await loadProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast('Error deleting product', 'error');
    }
}

// ============================================
// LOAD SETTINGS
// ============================================
async function loadSettings() {
    try {
        const settings = await getSettings();
        document.getElementById('businessName').value = settings.businessName || 'Amisty Company';
        document.getElementById('businessAddress').value = settings.businessAddress || '';
        document.getElementById('businessPhone').value = settings.businessPhone || '';
        document.getElementById('managerPIN').value = settings.managerPIN || 'admin123';
        document.getElementById('sellerPIN').value = settings.sellerPIN || 'seller123';
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

// ============================================
// SAVE SETTINGS
// ============================================
async function saveSettings() {
    const businessName = document.getElementById('businessName').value.trim();
    const businessAddress = document.getElementById('businessAddress').value.trim();
    const businessPhone = document.getElementById('businessPhone').value.trim();
    const managerPIN = document.getElementById('managerPIN').value.trim();
    const sellerPIN = document.getElementById('sellerPIN').value.trim();
    
    if (!managerPIN || !sellerPIN) {
        showToast('PINs cannot be empty', 'error');
        return;
    }
    
    try {
        await db.collection('settings').doc('appSettings').set({
            businessName: businessName || 'Amisty Company',
            businessAddress,
            businessPhone,
            managerPIN,
            sellerPIN,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Settings saved! ✓', 'success');
    } catch (error) {
        console.error("Error saving settings:", error);
        showToast('Error saving settings', 'error');
    }
}