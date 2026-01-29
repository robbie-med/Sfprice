// Hospital Cost Itemizer Application

class HospitalCostItemizer {
    constructor() {
        this.data = null;
        this.cart = [];
        this.priceType = 'gross_charge';
        this.searchTimeout = null;

        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadData();
        this.loadCartFromStorage();
        this.updateCartDisplay();
    }

    bindElements() {
        this.searchInput = document.getElementById('search-input');
        this.priceTypeSelect = document.getElementById('price-type');
        this.searchResults = document.getElementById('search-results');
        this.cartItems = document.getElementById('cart-items');
        this.subtotalEl = document.getElementById('subtotal');
        this.totalEl = document.getElementById('total');
        this.clearCartBtn = document.getElementById('clear-cart');
        this.printListBtn = document.getElementById('print-list');
        this.hospitalInfo = document.getElementById('hospital-info');
        this.lastUpdated = document.getElementById('last-updated');
    }

    bindEvents() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.priceTypeSelect.addEventListener('change', (e) => {
            this.priceType = e.target.value;
            this.handleSearch();
            this.updateCartDisplay();
        });
        this.clearCartBtn.addEventListener('click', () => this.clearCart());
        this.printListBtn.addEventListener('click', () => this.printList());
    }

    async loadData() {
        this.searchResults.innerHTML = '<div class="loading">Loading hospital data...</div>';

        try {
            const response = await fetch('data/charges.json');
            if (!response.ok) {
                throw new Error('Failed to load data');
            }
            this.data = await response.json();
            this.displayHospitalInfo();
            this.searchResults.innerHTML = '<p class="no-results">Start typing to search for items...</p>';
        } catch (error) {
            console.error('Error loading data:', error);
            this.searchResults.innerHTML = `
                <div class="no-results">
                    <p>Error loading hospital data.</p>
                    <p>Please ensure the data file is available at data/charges.json</p>
                </div>
            `;
        }
    }

    displayHospitalInfo() {
        if (!this.data) return;

        const addressList = this.data.hospital_address || [];
        const address = addressList.length > 0 ? addressList[0] : '';

        this.hospitalInfo.innerHTML = `
            <p><strong>${this.data.hospital_name || 'Hospital'}</strong></p>
            <p>${address}</p>
        `;

        this.lastUpdated.textContent = this.data.last_updated_on || 'Unknown';
    }

    handleSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();

        if (!query || query.length < 2) {
            this.searchResults.innerHTML = '<p class="no-results">Enter at least 2 characters to search...</p>';
            return;
        }

        if (!this.data || !this.data.standard_charge_information) {
            this.searchResults.innerHTML = '<p class="no-results">No data available.</p>';
            return;
        }

        const results = this.data.standard_charge_information.filter(item => {
            const description = (item.description || '').toLowerCase();
            const codes = (item.code_information || [])
                .map(c => (c.code || '').toLowerCase())
                .join(' ');

            return description.includes(query) || codes.includes(query);
        }).slice(0, 50); // Limit to 50 results for performance

        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            this.searchResults.innerHTML = '<p class="no-results">No items found matching your search.</p>';
            return;
        }

        const resultsHtml = results.map((item, index) => {
            const price = this.getItemPrice(item);
            const codeInfo = this.getCodeInfo(item);
            const drugInfo = this.getDrugInfo(item);
            const uniqueId = this.generateItemId(item);

            return `
                <div class="search-result-item" data-index="${index}">
                    <div class="item-info">
                        <div class="item-description">${this.escapeHtml(item.description)}</div>
                        ${codeInfo ? `<div class="item-code">${codeInfo}</div>` : ''}
                        ${drugInfo ? `<div class="item-drug-info">${drugInfo}</div>` : ''}
                    </div>
                    <div class="item-price">${this.formatCurrency(price)}</div>
                    <button class="btn btn-add" onclick="app.addToCart('${uniqueId}')">Add</button>
                </div>
            `;
        }).join('');

        this.searchResults.innerHTML = `
            <div class="results-count">Found ${results.length} item${results.length !== 1 ? 's' : ''}</div>
            ${resultsHtml}
        `;

        // Store results for adding to cart
        this.currentResults = results;
    }

    getItemPrice(item) {
        if (!item.standard_charges || item.standard_charges.length === 0) {
            return 0;
        }
        return item.standard_charges[0][this.priceType] || 0;
    }

    getCodeInfo(item) {
        if (!item.code_information || item.code_information.length === 0) {
            return '';
        }
        return item.code_information
            .map(c => `${c.type}: ${c.code}`)
            .join(' | ');
    }

    getDrugInfo(item) {
        if (!item.drug_information) {
            return '';
        }
        const { unit, type } = item.drug_information;
        if (unit && type) {
            return `Unit: ${unit} ${type}`;
        }
        return '';
    }

    generateItemId(item) {
        // Generate a unique ID based on description and code
        const desc = item.description || '';
        const code = item.code_information?.[0]?.code || '';
        return btoa(encodeURIComponent(desc + code)).replace(/[^a-zA-Z0-9]/g, '');
    }

    addToCart(uniqueId) {
        if (!this.currentResults) return;

        // Find the item by matching the generated ID
        const item = this.currentResults.find(i => this.generateItemId(i) === uniqueId);
        if (!item) return;

        // Check if item already in cart
        const existingIndex = this.cart.findIndex(c => this.generateItemId(c.item) === uniqueId);

        if (existingIndex !== -1) {
            this.cart[existingIndex].quantity++;
        } else {
            this.cart.push({
                item: item,
                quantity: 1
            });
        }

        this.saveCartToStorage();
        this.updateCartDisplay();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCartToStorage();
        this.updateCartDisplay();
    }

    updateQuantity(index, delta) {
        const newQty = this.cart[index].quantity + delta;
        if (newQty <= 0) {
            this.removeFromCart(index);
        } else {
            this.cart[index].quantity = newQty;
            this.saveCartToStorage();
            this.updateCartDisplay();
        }
    }

    clearCart() {
        if (this.cart.length === 0) return;
        if (confirm('Are you sure you want to clear all items?')) {
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartDisplay();
        }
    }

    updateCartDisplay() {
        if (this.cart.length === 0) {
            this.cartItems.innerHTML = '<p class="empty-cart">No items added yet. Search and add items above.</p>';
            this.subtotalEl.textContent = '$0.00';
            this.totalEl.textContent = '$0.00';
            return;
        }

        let subtotal = 0;

        const cartHtml = this.cart.map((cartItem, index) => {
            const price = this.getItemPrice(cartItem.item);
            const lineTotal = price * cartItem.quantity;
            subtotal += lineTotal;

            const codeInfo = this.getCodeInfo(cartItem.item);

            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-description">${this.escapeHtml(cartItem.item.description)}</div>
                        ${codeInfo ? `<div class="cart-item-code">${codeInfo}</div>` : ''}
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button onclick="app.updateQuantity(${index}, -1)">-</button>
                            <span>${cartItem.quantity}</span>
                            <button onclick="app.updateQuantity(${index}, 1)">+</button>
                        </div>
                        <div class="cart-item-price">${this.formatCurrency(lineTotal)}</div>
                        <button class="btn btn-danger" onclick="app.removeFromCart(${index})">X</button>
                    </div>
                </div>
            `;
        }).join('');

        this.cartItems.innerHTML = cartHtml;
        this.subtotalEl.textContent = this.formatCurrency(subtotal);
        this.totalEl.textContent = this.formatCurrency(subtotal);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveCartToStorage() {
        try {
            localStorage.setItem('hospitalCart', JSON.stringify(this.cart));
            localStorage.setItem('hospitalCartPriceType', this.priceType);
        } catch (e) {
            console.warn('Could not save cart to localStorage:', e);
        }
    }

    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem('hospitalCart');
            const savedPriceType = localStorage.getItem('hospitalCartPriceType');

            if (saved) {
                this.cart = JSON.parse(saved);
            }
            if (savedPriceType) {
                this.priceType = savedPriceType;
                this.priceTypeSelect.value = savedPriceType;
            }
        } catch (e) {
            console.warn('Could not load cart from localStorage:', e);
            this.cart = [];
        }
    }

    printList() {
        window.print();
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HospitalCostItemizer();
});
