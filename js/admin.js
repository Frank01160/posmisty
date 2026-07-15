// ============================================
// ADMIN PANEL MODULE - FULLY FIXED
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
    // Check auth first
    if (!checkAuth()) {
        window.location.href = '../index.html';
        return;
    }
    
    // Only managers can access
    if (currentUserType !== 'admin') {
        showToast('Access denied. Manager only!', 'error');
        setTimeout(() => window.location.href = 'pos.html', 2000);
        return;
    }
    
    // Setup sidebar navigation
    setupSidebarNavigation();
    
    // Load all data
    await loadAllData();
    
    // Show units section by default
    showSection('units');
    
    // Load settings
    await loadSettingsData();
});

// ============================================
// SETUP SIDEBAR NAVIGATION
// ============================================
function setupSidebarNavigation() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            
            // Update active state
            sidebarBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show the section
            showSection(section);
        });
    });
}

// ============================================
// SHOW SECTION
// ============================================
function showSection(section) {
    // Hide all sections
    const allSections = document.querySelectorAll('.admin-section');
    allSections.forEach(s => {
        s.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
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
// LOAD ALL DATA
// ============================================
async function loadAllData() {
    try {
        await loadUnitPairs();
        await loadCategories();
        await loadProducts();
    } catch (error) {
        console.error("Error loading data:", error);
        showToast('Error loading data. Check console.', 'error');
    }
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
        updateProductFormSelects();
    } catch (error) {
        console.error("Error loading unit pairs:", error);
        document.getElementById('unitsTableBody').innerHTML = 
            '<tr class="empty-row"><td colspan="4">❌ Error loading unit pairs. Check Firebase connection.</td></tr>';
    }
}

// ============================================
// DISPLAY UNIT PAIRS
// ============================================
function displayUnitPairs() {
    const tbody = document.getElementById('unitsTableBody');
    
    if (!allUnitPairs || allUnitPairs.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">📏 No unit pairs defined yet. Click "+ Add Unit Pair" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = allUnitPairs.map(up => `
        <tr>
            <td><strong>${up.primaryUnit}</strong></td>
            <td><strong>${up.secondaryUnit}</strong></td>
            <td>1 ${up.primaryUnit} = ${up.ratio} ${up.secondaryUnit}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="editUnitPair('${up.id}')">✏️</button>
                <button class="btn-delete" onclick="deleteUnitPair('${up.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// SHOW ADD UNIT FORM
// ============================================
function showAddUnitForm() {
    editingUnitId = null;
    document.getElementById('addUnitForm').style.display = 'block';
    document.getElementById('unitName1').value = '';
    document.getElementById('unitName2').value = '';
    document.getElementById('unitRatio').value = '';
    updateUnitPreview();
    document.getElementById('addUnitForm').scrollIntoView({ behavior: 'smooth' });
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
        showToast('Please enter a valid ratio greater than 0', 'error');
        return;
    }
    
    try {
        if (editingUnitId) {
            // Update existing
            await db.collection('unitPairs').doc(editingUnitId).update({
                primaryUnit: primaryUnit,
                secondaryUnit: secondaryUnit,
                ratio: ratio,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Unit pair updated successfully!', 'success');
        } else {
            // Create new
            await db.collection('unitPairs').add({
                primaryUnit: primaryUnit,
                secondaryUnit: secondaryUnit,
                ratio: ratio,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Unit pair added successfully!', 'success');
        }
        
        hideAddUnitForm();
        await loadUnitPairs();
    } catch (error) {
        console.error("Error saving unit pair:", error);
        showToast('❌ Error saving unit pair: ' + error.message, 'error');
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
    document.getElementById('addUnitForm').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// DELETE UNIT PAIR
// ============================================
async function deleteUnitPair(id) {
    if (!confirm('⚠️ Are you sure you want to delete this unit pair?')) return;
    
    try {
        await db.collection('unitPairs').doc(id).delete();
        showToast('✅ Unit pair deleted', 'success');
        await loadUnitPairs();
    } catch (error) {
        console.error("Error deleting unit pair:", error);
        showToast('❌ Error deleting unit pair', 'error');
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
        updateProductFormSelects();
    } catch (error) {
        console.error("Error loading categories:", error);
        document.getElementById('categoriesTableBody').innerHTML = 
            '<tr class="empty-row"><td colspan="3">❌ Error loading categories</td></tr>';
    }
}

// ============================================
// DISPLAY CATEGORIES
// ============================================
function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (!allCategories || allCategories.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">📂 No categories yet. Click "+ Add Category" to create one.</td></tr>';
        return;
    }
    
    tbody.innerHTML = allCategories.map(cat => {
        const productCount = allProducts.filter(p => p.categoryId === cat.id).length;
        return `
            <tr>
                <td>📂 <strong>${cat.name}</strong></td>
                <td>${productCount} products</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="editCategory('${cat.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteCategory('${cat.id}')">🗑️</button>
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
    document.getElementById('addCategoryForm').scrollIntoView({ behavior: 'smooth' });
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
                name: name,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Category updated!', 'success');
        } else {
            await db.collection('categories').add({
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Category added!', 'success');
        }
        
        hideAddCategoryForm();
        await loadCategories();
    } catch (error) {
        console.error("Error saving category:", error);
        showToast('❌ Error saving category', 'error');
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
    if (!confirm('⚠️ Delete this category?')) return;
    
    try {
        await db.collection('categories').doc(id).delete();
        showToast('✅ Category deleted', 'success');
        await loadCategories();
    } catch (error) {
        console.error("Error deleting category:", error);
        showToast('❌ Error deleting category', 'error');
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
        updateProductFormSelects();
    } catch (error) {
        console.error("Error loading products:", error);
        document.getElementById('productsTableBody').innerHTML = 
            '<tr class="empty-row"><td colspan="7">❌ Error loading products</td></tr>';
    }
}

// ============================================
// DISPLAY PRODUCTS (ADMIN VIEW)
// ============================================
function displayProductsAdmin() {
    const tbody = document.getElementById('productsTableBody');
    
    if (!allProducts || allProducts.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">📦 No products yet. Click "+ Add Product" to add one.</td></tr>';
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
// UPDATE PRODUCT FORM SELECTS
// ============================================
function updateProductFormSelects() {
    // Update category select
    const categorySelect = document.getElementById('productCategory');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select category</option>';
        allCategories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
    
    // Update unit pair select
    const unitSelect = document.getElementById('productUnitPair');
    if (unitSelect) {
        unitSelect.innerHTML = '<option value="">Select unit pair (optional)</option>';
        allUnitPairs.forEach(up => {
            unitSelect.innerHTML += `<option value="${up.id}">1 ${up.primaryUnit} = ${up.ratio} ${up.secondaryUnit}</option>`;
        });
    }
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
    updateProductFormSelects();
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
    const stock = parseFloat(document.getElementById('initialStock').value) || 0;
    
    if (!name) { showToast('Product name is required', 'error'); return; }
    if (!sellingPrice || sellingPrice <= 0) { showToast('Valid selling price required', 'error'); return; }
    
    // Handle new category creation
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
    
    const productData = {
        name: name,
        categoryId: categoryId || null,
        category: allCategories.find(c => c.id === categoryId)?.name || newCategory || 'Uncategorized',
        unitPairId: unitPairId || null,
        sellingPrice: sellingPrice,
        buyingPrice: buyingPrice || 0,
        stock: stock,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editingProductId) {
            await db.collection('products').doc(editingProductId).update(productData);
            showToast('✅ Product updated!', 'success');
        } else {
            await db.collection('products').add({
                ...productData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('✅ Product added!', 'success');
        }
        
        hideAddProductForm();
        await loadProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        showToast('❌ Error saving product: ' + error.message, 'error');
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
    document.getElementById('productUnitPair').value = product.unitPairId || '';
    document.getElementById('sellingPrice').value = product.sellingPrice;
    document.getElementById('buyingPrice').value = product.buyingPrice || 0;
    document.getElementById('initialStock').value = product.stock;
    updateProductFormSelects();
    document.getElementById('addProductForm').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// DELETE PRODUCT
// ============================================
async function deleteProduct(id) {
    if (!confirm('⚠️ Delete this product? This cannot be undone.')) return;
    
    try {
        await db.collection('products').doc(id).delete();
        showToast('✅ Product deleted', 'success');
        await loadProducts();
    } catch (error) {
        console.error("Error deleting product:", error);
        showToast('❌ Error deleting product', 'error');
    }
}

// ============================================
// LOAD SETTINGS
// ============================================
async function loadSettingsData() {
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
            businessAddress: businessAddress,
            businessPhone: businessPhone,
            managerPIN: managerPIN,
            sellerPIN: sellerPIN,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('✅ Settings saved successfully!', 'success');
    } catch (error) {
        console.error("Error saving settings:", error);
        showToast('❌ Error saving settings: ' + error.message, 'error');
    }
}
