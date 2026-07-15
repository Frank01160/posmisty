// ============================================
// REPORTS.JS - Reports & History Logic
// Uses Data.js for all database operations
// ============================================

let currentSales = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    // Set user badge
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = App.userType === 'admin' ? 'Manager' : 'Seller';
    
    // Show admin links for manager
    if (App.userType === 'admin') {
        const adminLink = document.getElementById('adminLink');
        const historyLink = document.getElementById('historyLink');
        if (adminLink) adminLink.style.display = 'inline';
        if (historyLink) historyLink.style.display = 'inline';
    }
    
    // Set default dates
    const today = getToday();
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const histFrom = document.getElementById('histFrom');
    const histTo = document.getElementById('histTo');
    
    if (dateFrom) dateFrom.value = today;
    if (dateTo) dateTo.value = today;
    if (histFrom) histFrom.value = getDaysAgo(30);
    if (histTo) histTo.value = today;
    
    // Load data based on which page we're on
    if (document.getElementById('salesBody')) {
        await loadToday();
    }
    
    if (document.getElementById('stockHistoryBody')) {
        await Data.getCategories();
        await Data.getProducts();
        populateHistoryFilters();
        await loadHistory();
    }
});

// ============================================
// LOAD TODAY'S SALES
// ============================================
async function loadToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('dateFrom').value = getToday();
    document.getElementById('dateTo').value = getToday();
    
    currentSales = await Data.getSales(today, tomorrow);
    renderSales();
}

// ============================================
// LOAD THIS WEEK
// ============================================
async function loadThisWeek() {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    document.getElementById('dateFrom').value = weekAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = getToday();
    
    currentSales = await Data.getSales(weekAgo, now);
    renderSales();
}

// ============================================
// LOAD SALES WITH FILTER
// ============================================
async function loadSales() {
    const from = document.getElementById('dateFrom').value;
    const to = document.getElementById('dateTo').value;
    
    if (!from || !to) return showToast('Select date range', 'error');
    
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    
    currentSales = await Data.getSales(fromDate, toDate);
    renderSales();
}

// ============================================
// RENDER SALES TABLE
// ============================================
function renderSales() {
    const tbody = document.getElementById('salesBody');
    
    // Update summary
    const totalSales = currentSales.reduce((s, sale) => s + sale.total, 0);
    const totalProfit = currentSales.reduce((s, sale) => s + (sale.totalProfit || 0), 0);
    const itemsSold = currentSales.reduce((s, sale) => 
        s + sale.items.reduce((si, item) => si + item.quantityInSmallest, 0), 0);
    
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('itemsSold').textContent = itemsSold.toFixed(1);
    document.getElementById('transCount').textContent = currentSales.length;
    
    if (!currentSales.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No sales in this period</td></tr>';
        return;
    }
    
    tbody.innerHTML = currentSales.map(sale => {
        const items = sale.items.map(i => 
            `${i.productName} (${i.primaryQty?.toFixed(1) || i.quantityInSmallest})`
        ).join(', ');
        
        return `
            <tr>
                <td>${formatDateShort(sale.timestamp)}</td>
                <td title="${items}">${items.substring(0, 40)}${items.length > 40 ? '...' : ''}</td>
                <td>${formatCurrency(sale.subtotal)}</td>
                <td>${formatCurrency(sale.discount || 0)}</td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td class="${(sale.totalProfit || 0) >= 0 ? 'text-green' : 'text-red'}">
                    ${formatCurrency(sale.totalProfit || 0)}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// EXPORT CSV
// ============================================
function exportCSV() {
    if (!currentSales.length) return showToast('No data to export', 'error');
    
    let csv = 'Date,Items,Subtotal,Discount,Total,Profit\n';
    
    currentSales.forEach(sale => {
        const items = sale.items.map(i => `${i.productName} (${i.primaryQty?.toFixed(1)} ${i.primaryUnit})`).join('; ');
        csv += `"${formatDateShort(sale.timestamp)}","${items}","${sale.subtotal}","${sale.discount || 0}","${sale.total}","${sale.totalProfit || 0}"\n`;
    });
    
    const total = currentSales.reduce((s, sale) => s + sale.total, 0);
    const profit = currentSales.reduce((s, sale) => s + (sale.totalProfit || 0), 0);
    csv += `\n"TOTAL","","","","${total}","${profit}"\n`;
    
    downloadFile(csv, `sales_report_${getToday()}.csv`, 'text/csv');
    showToast('CSV exported!', 'success');
}

// ============================================
// EXPORT WORD
// ============================================
function exportWord() {
    if (!currentSales.length) return showToast('No data to export', 'error');
    
    const total = currentSales.reduce((s, sale) => s + sale.total, 0);
    const profit = currentSales.reduce((s, sale) => s + (sale.totalProfit || 0), 0);
    
    let html = `<html><head><meta charset="UTF-8"><style>
        body{font-family:Arial;padding:20px} h1{color:#059669} 
        table{width:100%;border-collapse:collapse} 
        th{background:#059669;color:#fff;padding:10px} 
        td{padding:8px;border-bottom:1px solid #ddd}
        .summary{background:#F0FDF4;padding:15px;border-radius:8px;margin:15px 0}
    </style></head><body>
        <h1>📊 Amisty Company - Sales Report</h1>
        <p>Period: ${document.getElementById('dateFrom').value} to ${document.getElementById('dateTo').value}</p>
        <div class="summary">
            <p><strong>Total Sales:</strong> ${formatCurrency(total)}</p>
            <p><strong>Total Profit:</strong> ${formatCurrency(profit)}</p>
            <p><strong>Transactions:</strong> ${currentSales.length}</p>
        </div>
        <table><tr><th>Date</th><th>Items</th><th>Total</th><th>Profit</th></tr>
        ${currentSales.map(s => `
            <tr>
                <td>${formatDateShort(s.timestamp)}</td>
                <td>${s.items.map(i => i.productName).join(', ')}</td>
                <td>${formatCurrency(s.total)}</td>
                <td>${formatCurrency(s.totalProfit || 0)}</td>
            </tr>
        `).join('')}
        </table>
        <p style="text-align:center;margin-top:20px;color:#666">Generated by Amisty POS</p>
    </body></html>`;
    
    downloadFile(html, `sales_report_${getToday()}.doc`, 'application/msword');
    showToast('Word document exported!', 'success');
}

// ============================================
// DOWNLOAD HELPER
// ============================================
function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// ========== HISTORY PAGE FUNCTIONS ==========
// ============================================

function populateHistoryFilters() {
    const catSelect = document.getElementById('histCategory');
    if (catSelect) {
        App.categories.forEach(c => {
            catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }
    
    const prodSelect = document.getElementById('histProduct');
    if (prodSelect) {
        App.products.forEach(p => {
            prodSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }
}

async function loadHistory() {
    const catFilter = document.getElementById('histCategory')?.value || 'all';
    const prodFilter = document.getElementById('histProduct')?.value || 'all';
    const from = document.getElementById('histFrom')?.value;
    const to = document.getElementById('histTo')?.value;
    
    const filters = {};
    
    if (prodFilter !== 'all') filters.productId = prodFilter;
    if (catFilter !== 'all') filters.category = catFilter;
    if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        filters.fromDate = d;
    }
    if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filters.toDate = d;
    }
    
    // Load stock history
    const history = await Data.getStockHistory(filters);
    renderStockHistory(history);
    
    // Load performance
    await loadPerformance(filters);
}

function renderStockHistory(history) {
    const tbody = document.getElementById('stockHistoryBody');
    
    if (!history.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No stock changes</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.slice(0, 100).map(h => {
        const changeClass = h.quantityChange >= 0 ? 'text-green' : 'text-red';
        const sign = h.quantityChange >= 0 ? '+' : '';
        
        return `
            <tr>
                <td>${formatDateShort(h.timestamp)}</td>
                <td><strong>${h.productName}</strong></td>
                <td>${h.category || ''}</td>
                <td><span class="badge-sm">${h.changeType}</span></td>
                <td class="${changeClass}">${sign}${h.quantityChange}</td>
                <td>${h.reason || ''}</td>
                <td>${h.doneBy}</td>
            </tr>
        `;
    }).join('');
}

async function loadPerformance(filters) {
    // Get all sales for performance
    const sales = await Data.getSales(filters.fromDate, filters.toDate);
    
    // Aggregate by product
    const perfMap = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!perfMap[item.productName]) {
                perfMap[item.productName] = { sold: 0, revenue: 0, profit: 0 };
            }
            perfMap[item.productName].sold += item.quantityInSmallest;
            perfMap[item.productName].revenue += item.totalPrice;
            perfMap[item.productName].profit += (item.profit || 0);
        });
    });
    
    const perfData = Object.entries(perfMap).map(([name, data]) => ({
        productName: name, ...data
    }));
    
    // Sort by revenue
    perfData.sort((a, b) => b.revenue - a.revenue);
    
    const tbody = document.getElementById('perfBody');
    
    if (!perfData.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No sales data</td></tr>';
        return;
    }
    
    tbody.innerHTML = perfData.map(p => {
        const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td><strong>${p.productName}</strong></td>
                <td>${p.sold.toFixed(1)}</td>
                <td>${formatCurrency(p.revenue)}</td>
                <td class="${p.profit >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(p.profit)}</td>
                <td>${margin}%</td>
            </tr>
        `;
    }).join('');
}

console.log('✅ Reports module loaded');