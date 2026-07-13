// ============================================
// REPORTS MODULE
// ============================================

let allSales = [];
let filteredSales = [];

// ============================================
// INITIALIZE REPORTS
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    // Show admin buttons for manager
    if (currentUserType === 'admin') {
        const adminBtn = document.getElementById('adminBtn');
        const historyBtn = document.getElementById('historyBtn');
        if (adminBtn) adminBtn.style.display = 'flex';
        if (historyBtn) historyBtn.style.display = 'flex';
    }
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFrom').value = today;
    document.getElementById('dateTo').value = today;
    
    await loadToday();
});

// ============================================
// LOAD TODAY'S SALES
// ============================================
async function loadToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('dateFrom').value = today.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    
    await loadSalesByDate(today, tomorrow);
}

// ============================================
// LOAD REPORTS WITH FILTER
// ============================================
async function loadReports() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (!dateFrom || !dateTo) {
        showToast('Please select date range', 'error');
        return;
    }
    
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    await loadSalesByDate(fromDate, toDate);
}

// ============================================
// LOAD SALES BY DATE RANGE
// ============================================
async function loadSalesByDate(fromDate, toDate) {
    try {
        const snapshot = await db.collection('sales')
            .where('timestamp', '>=', fromDate)
            .where('timestamp', '<=', toDate)
            .orderBy('timestamp', 'desc')
            .get();
        
        allSales = [];
        snapshot.forEach(doc => {
            allSales.push({ id: doc.id, ...doc.data() });
        });
        
        filteredSales = allSales;
        updateSummaryCards();
        displaySalesTable();
    } catch (error) {
        console.error("Error loading reports:", error);
        showToast('Error loading reports', 'error');
    }
}

// ============================================
// UPDATE SUMMARY CARDS
// ============================================
function updateSummaryCards() {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    const itemsSold = filteredSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantityInSmallest, 0);
    }, 0);
    const transactionCount = filteredSales.length;
    
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    document.getElementById('itemsSold').textContent = itemsSold.toFixed(2);
    document.getElementById('transactionCount').textContent = transactionCount;
}

// ============================================
// DISPLAY SALES TABLE
// ============================================
function displaySalesTable() {
    const tbody = document.getElementById('reportsTableBody');
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No sales data for this period</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredSales.map(sale => {
        const itemsSummary = sale.items.map(item => 
            `${item.productName} (${item.primaryQty?.toFixed(2) || item.quantityInSmallest} ${item.primaryUnit || 'units'})`
        ).join(', ');
        
        return `
            <tr>
                <td>${formatDate(sale.timestamp)}</td>
                <td title="${itemsSummary}">${itemsSummary.substring(0, 50)}${itemsSummary.length > 50 ? '...' : ''}</td>
                <td>${formatCurrency(sale.subtotal)}</td>
                <td>${formatCurrency(sale.discount || 0)}</td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td class="${sale.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(sale.totalProfit || 0)}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// EXPORT AS CSV
// ============================================
function exportCSV() {
    if (filteredSales.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    let csv = 'Date,Items,Subtotal,Discount,Total,Profit\n';
    
    filteredSales.forEach(sale => {
        const date = formatDate(sale.timestamp);
        const items = sale.items.map(item => 
            `${item.productName} (${item.primaryQty?.toFixed(2)} ${item.primaryUnit})`
        ).join('; ');
        
        csv += `"${date}","${items}","${sale.subtotal}","${sale.discount || 0}","${sale.total}","${sale.totalProfit || 0}"\n`;
    });
    
    // Add summary
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    csv += `\n"TOTAL","","","","${totalSales}","${totalProfit}"\n`;
    
    downloadFile(csv, `amisty_sales_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showToast('CSV exported successfully! ✓', 'success');
}

// ============================================
// EXPORT AS WORD (DOC)
// ============================================
function exportWord() {
    if (filteredSales.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; text-align: center; }
                h2 { color: #667eea; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #667eea; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .summary { background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; }
            </style>
        </head>
        <body>
            <h1>📊 Amisty Company - Sales Report</h1>
            <p>Period: ${document.getElementById('dateFrom').value} to ${document.getElementById('dateTo').value}</p>
            <p>Generated: ${new Date().toLocaleString('en-KE')}</p>
            
            <div class="summary">
                <h2>Summary</h2>
                <p><strong>Total Sales:</strong> ${formatCurrency(totalSales)}</p>
                <p><strong>Total Profit:</strong> ${formatCurrency(totalProfit)}</p>
                <p><strong>Total Transactions:</strong> ${filteredSales.length}</p>
            </div>
            
            <h2>Transaction Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>Discount</th>
                        <th>Total</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSales.map(sale => `
                        <tr>
                            <td>${formatDate(sale.timestamp)}</td>
                            <td>${sale.items.map(item => 
                                `${item.productName} (${item.primaryQty?.toFixed(2)} ${item.primaryUnit})`
                            ).join('<br>')}</td>
                            <td>${formatCurrency(sale.subtotal)}</td>
                            <td>${formatCurrency(sale.discount || 0)}</td>
                            <td>${formatCurrency(sale.total)}</td>
                            <td>${formatCurrency(sale.totalProfit || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Generated by Amisty POS System</p>
                <p>Contact: 0760 545 5312</p>
            </div>
        </body>
        </html>
    `;
    
    downloadFile(html, `amisty_sales_report_${new Date().toISOString().split('T')[0]}.doc`, 'application/msword');
    showToast('Word document exported! ✓', 'success');
}

// ============================================
// DOWNLOAD FILE HELPER
// ============================================
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}