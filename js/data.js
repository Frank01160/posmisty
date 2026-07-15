// ============================================
// DATA.JS - Central Data Store
// All Firestore operations + Auth passwords
// ============================================

const Data = {
    
    // ============================================
    // SETTINGS (includes auth PINs)
    // ============================================
    
    async getSettings() {
        try {
            const doc = await db.collection('settings').doc('appSettings').get();
            if (doc.exists) {
                App.settings = doc.data();
                return doc.data();
            }
            // Return defaults if no settings exist
            return {
                managerPIN: 'admin123',
                sellerPIN: 'seller123',
                businessName: 'Amisty Company',
                businessAddress: '',
                businessPhone: '07605455312'
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            return {
                managerPIN: 'admin123',
                sellerPIN: 'seller123',
                businessName: 'Amisty Company'
            };
        }
    },
    
    async saveSettings(data) {
        try {
            await db.collection('settings').doc('appSettings').set({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            App.settings = { ...App.settings, ...data };
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    },
    
    // ============================================
    // AUTH - Verify login PINs
    // ============================================
    
    async verifyManagerPIN(pin) {
        const settings = await this.getSettings();
        return pin === (settings.managerPIN || 'admin123');
    },
    
    async verifySellerPIN(pin) {
        const settings = await this.getSettings();
        return pin === (settings.sellerPIN || 'seller123');
    },
    
    // ============================================
    // UNIT PAIRS
    // ============================================
    
    async getUnitPairs() {
        try {
            const snapshot = await db.collection('unitPairs').orderBy('createdAt', 'desc').get();
            App.unitPairs = [];
            snapshot.forEach(doc => {
                App.unitPairs.push({ id: doc.id, ...doc.data() });
            });
            return App.unitPairs;
        } catch (error) {
            console.error('Error loading unit pairs:', error);
            return [];
        }
    },
    
    async addUnitPair(data) {
        try {
            const ref = await db.collection('unitPairs').add({
                primaryUnit: data.primaryUnit,
                secondaryUnit: data.secondaryUnit,
                ratio: parseFloat(data.ratio),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return ref.id;
        } catch (error) {
            console.error('Error adding unit pair:', error);
            throw error;
        }
    },
    
    async updateUnitPair(id, data) {
        try {
            await db.collection('unitPairs').doc(id).update({
                primaryUnit: data.primaryUnit,
                secondaryUnit: data.secondaryUnit,
                ratio: parseFloat(data.ratio),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating unit pair:', error);
            throw error;
        }
    },
    
    async deleteUnitPair(id) {
        try {
            await db.collection('unitPairs').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting unit pair:', error);
            throw error;
        }
    },
    
    // ============================================
    // CATEGORIES
    // ============================================
    
    async getCategories() {
        try {
            const snapshot = await db.collection('categories').orderBy('name', 'asc').get();
            App.categories = [];
            snapshot.forEach(doc => {
                App.categories.push({ id: doc.id, ...doc.data() });
            });
            return App.categories;
        } catch (error) {
            console.error('Error loading categories:', error);
            return [];
        }
    },
    
    async addCategory(name) {
        try {
            const ref = await db.collection('categories').add({
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return ref.id;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    },
    
    async updateCategory(id, name) {
        try {
            await db.collection('categories').doc(id).update({
                name: name,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    },
    
    async deleteCategory(id) {
        try {
            await db.collection('categories').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    },
    
    // ============================================
    // PRODUCTS
    // ============================================
    
    async getProducts() {
        try {
            const snapshot = await db.collection('products').orderBy('name', 'asc').get();
            App.products = [];
            snapshot.forEach(doc => {
                App.products.push({ id: doc.id, ...doc.data() });
            });
            return App.products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    },
    
    async addProduct(data) {
        try {
            const ref = await db.collection('products').add({
                name: data.name,
                categoryId: data.categoryId || null,
                category: data.category || 'Uncategorized',
                unitPairId: data.unitPairId || null,
                sellingPrice: parseFloat(data.sellingPrice) || 0,
                buyingPrice: parseFloat(data.buyingPrice) || 0,
                stock: parseFloat(data.stock) || 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return ref.id;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    },
    
    async updateProduct(id, data) {
        try {
            await db.collection('products').doc(id).update({
                name: data.name,
                categoryId: data.categoryId || null,
                category: data.category || 'Uncategorized',
                unitPairId: data.unitPairId || null,
                sellingPrice: parseFloat(data.sellingPrice) || 0,
                buyingPrice: parseFloat(data.buyingPrice) || 0,
                stock: parseFloat(data.stock) || 0,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },
    
    async deleteProduct(id) {
        try {
            await db.collection('products').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },
    
    async updateProductStock(id, newStock) {
        try {
            await db.collection('products').doc(id).update({
                stock: newStock,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    },
    
    // ============================================
    // SALES
    // ============================================
    
    async createSale(saleData) {
        try {
            const batch = db.batch();
            
            // Update stock for each item
            for (const item of saleData.items) {
                const productRef = db.collection('products').doc(item.productId);
                const product = App.products.find(p => p.id === item.productId);
                if (product) {
                    const newStock = product.stock - item.quantityInSmallest;
                    batch.update(productRef, { 
                        stock: newStock,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Add stock history
                    const historyRef = db.collection('stockHistory').doc();
                    batch.set(historyRef, {
                        productId: item.productId,
                        productName: item.productName,
                        category: product.category || '',
                        changeType: 'sale',
                        quantityChange: -item.quantityInSmallest,
                        reason: 'Sale transaction',
                        doneBy: App.userType || 'seller',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            // Save sale record
            const saleRef = db.collection('sales').doc();
            batch.set(saleRef, {
                items: saleData.items,
                subtotal: saleData.subtotal,
                discount: saleData.discount,
                total: saleData.total,
                totalProfit: saleData.totalProfit,
                soldBy: App.userType || 'seller',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await batch.commit();
            return saleRef.id;
        } catch (error) {
            console.error('Error creating sale:', error);
            throw error;
        }
    },
    
    async getSales(fromDate, toDate) {
        try {
            let query = db.collection('sales').orderBy('timestamp', 'desc');
            
            if (fromDate) {
                query = query.where('timestamp', '>=', fromDate);
            }
            if (toDate) {
                query = query.where('timestamp', '<=', toDate);
            }
            
            const snapshot = await query.get();
            const sales = [];
            snapshot.forEach(doc => {
                sales.push({ id: doc.id, ...doc.data() });
            });
            return sales;
        } catch (error) {
            console.error('Error loading sales:', error);
            return [];
        }
    },
    
    // ============================================
    // STOCK HISTORY
    // ============================================
    
    async getStockHistory(filters = {}) {
        try {
            let query = db.collection('stockHistory').orderBy('timestamp', 'desc');
            
            if (filters.productId) {
                query = query.where('productId', '==', filters.productId);
            }
            if (filters.fromDate) {
                query = query.where('timestamp', '>=', filters.fromDate);
            }
            if (filters.toDate) {
                query = query.where('timestamp', '<=', filters.toDate);
            }
            
            const snapshot = await query.limit(500).get();
            const history = [];
            snapshot.forEach(doc => {
                history.push({ id: doc.id, ...doc.data() });
            });
            
            // Filter by category locally if needed
            if (filters.category && filters.category !== 'all') {
                return history.filter(h => h.category === filters.category);
            }
            
            return history;
        } catch (error) {
            console.error('Error loading stock history:', error);
            return [];
        }
    },
    
    async addStockChange(data) {
        try {
            await db.collection('stockHistory').add({
                ...data,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error adding stock change:', error);
            throw error;
        }
    },
    
    // ============================================
    // INIT - Initialize default settings on first run
    // ============================================
    
    async initDefaults() {
        const settingsRef = db.collection('settings').doc('appSettings');
        const doc = await settingsRef.get();
        
        if (!doc.exists) {
            await settingsRef.set({
                managerPIN: 'admin123',
                sellerPIN: 'seller123',
                businessName: 'Amisty Company',
                businessAddress: '',
                businessPhone: '07605455312',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Default settings created');
        }
    }
};

// Auto-initialize defaults
Data.initDefaults();

console.log('✅ Data module loaded');