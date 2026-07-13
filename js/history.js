// ============================================
// SHOP HISTORY MODULE (MANAGER ONLY)
// ============================================

let stockHistoryData = [];
let productPerformanceData = [];

// ============================================
// INITIALIZE HISTORY PAGE
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    // Only managers can access
    if (currentUserType !== 'admin') {
        showToast('Access denied. Manager only!', 'error');
        setTimeout(() => window.location.href = 'pos.html', 2000);
        return;
    }
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('historyDateTo').value = today;
    
    // Set from date to 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('historyDateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
    
    await loadFilterOptions();
    await loadHistory();
});

// ============================================
// LOAD FILTER OPTIONS
// ============================================
async function loadFilterOptions() {
    try {
        // Load categories
        const catSnapshot = await db.collection('categories').get();
        const categoryFilter = document.getElementById('historyCategoryFilter');
        catSnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            categoryFilter.appendChild(option);
        });
        
        // Load products
        const prodSnapshot = await db.collection('products').get();
        const productFilter = document.getElementById('historyProductFilter');
        prodSnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            productFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading filters:", error);
    }
}

// ============================================
// LOAD HISTORY DATA
// ============================================
async function loadHistory() {
    const categoryFilter = document.getElementById('historyCategoryFilter').value;
    const productFilter = document.getElementById('historyProductFilter').value;
    const dateFrom = document.getElementById('historyDateFrom').value;
    const dateTo = document.getElementById('historyDateTo').value;
    
    try {
        // Build query for stock history
        let stockQuery = db.collection('stockHistory').orderBy('timestamp', 'desc');
        
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            stockQuery = stockQuery.where('timestamp', '>=', fromDate);
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            stockQuery = stockQuery.where('timestamp', '<=', toDate);
        }
        
        const stockSnapshot = await stockQuery.get();
        stockHistoryData = [];
        stockSnapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            
            // Apply filters
            if (productFilter !== 'all' && data.productId !== productFilter) return;
            if (categoryFilter !== 'all' && data.category !== categoryFilter) return;
            
            stockHistoryData.push(data);
        });
        
        displayStockHistory();
        await loadProductPerformance(categoryFilter, productFilter, dateFrom, dateTo);
        
    } catch (error) {
        console.error("Error loading history:", error);
        showToast('Error loading history data', 'error');
    }
}

// ============================================
// DISPLAY STOCK HISTORY
// ============================================
function displayStockHistory() {
    const tbody = document.getElementById('stockHistoryBody');
    
    if (stockHistoryData.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No stock changes recorded</td></tr>';
        return;
    }
    
    tbody.innerHTML = stockHistoryData.map(record => {
        let changeClass = 'change-sale';
        if (record.changeType === 'add') changeClass = 'change-add';
        else if (record.changeType === 'remove') changeClass = 'change-remove';
        
        const changeSign = record.quantityChange >= 0 ? '+' : '';
        
        return `
            <tr>
                <td>${formatDate(record.timestamp)}</td>
                <td><strong>${record.productName}</strong></td>
                <td>${record.category || 'N/A'}</td>
                <td><span class="badge">${record.changeType}</span></td>
                <td class="${changeClass}">${changeSign}${record.quantityChange}</td>
                <td>${record.reason || ''}</td>
                <td>${record.doneBy === 'admin' ? '👑 Manager' : '👤 Seller'}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// LOAD PRODUCT PERFORMANCE
// ============================================
async function loadProductPerformance(categoryFilter, productFilter, dateFrom, dateTo) {
    try {
        let salesQuery = db.collection('sales').orderBy('timestamp', 'desc');
        
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            salesQuery = salesQuery.where('timestamp', '>=', fromDate);
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            salesQuery = salesQuery.where('timestamp', '<=', toDate);
        }
        
        const salesSnapshot = await salesQuery.get();
        
        // Aggregate by product
        const productMap = new Map();
        
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            sale.items.forEach(item => {
                const key = item.productName;
                
                if (productMap.has(key)) {
                    const existing = productMap.get(key);
                    existing.totalSold += item.quantityInSmallest;
                    existing.revenue += item.totalPrice;
                    existing.profit += (item.profit || 0);
                } else {
                    productMap.set(key, {
                        productName: item.productName,
                        totalSold: item.quantityInSmallest,
                        revenue: item.totalPrice,
                        profit: item.profit || 0
                    });
                }
            });
        });
        
        productPerformanceData = Array.from(productMap.values());
        
        // Apply filters
        if (productFilter !== 'all') {
            const product = await db.collection('products').doc(productFilter).get();
            if (product.exists) {
                productPerformanceData = productPerformanceData.filter(
                    p => p.productName === product.data().name
                );
            }
        }
        
        displayProductPerformance();
        
    } catch (error) {
        console.error("Error loading product performance:", error);
    }
}

// ============================================
// DISPLAY PRODUCT PERFORMANCE
// ============================================
function displayProductPerformance() {
    const tbody = document.getElementById('productPerformanceBody');
    
    if (productPerformanceData.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No sales data for this period</td></tr>';
        return;
    }
    
    // Sort by revenue (highest first)
    productPerformanceData.sort((a, b) => b.revenue - a.revenue);
    
    tbody.innerHTML = productPerformanceData.map(product => {
        const margin = product.revenue > 0 ? ((product.profit / product.revenue) * 100) : 0;
        
        return `
            <tr>
                <td><strong>${product.productName}</strong></td>
                <td>N/A</td>
                <td>${product.totalSold.toFixed(2)}</td>
                <td>${formatCurrency(product.revenue)}</td>
                <td class="${product.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(product.profit)}
                </td>
                <td>${margin.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}