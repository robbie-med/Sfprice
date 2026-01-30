// Hospital Cost Itemizer Application

class DrugParser {
    // Common route abbreviations
    static ROUTES = {
        'PO': 'Oral',
        'IV': 'Intravenous',
        'IM': 'Intramuscular',
        'SC': 'Subcutaneous',
        'SQ': 'Subcutaneous',
        'TD': 'Transdermal',
        'TOP': 'Topical',
        'PR': 'Rectal',
        'SL': 'Sublingual',
        'INH': 'Inhalation',
        'NA': 'Nasal',
        'OP': 'Ophthalmic',
        'OT': 'Otic',
        'VAG': 'Vaginal',
        'EX': 'External',
        'RE': 'Rectal'
    };

    // Common form abbreviations
    static FORMS = {
        'SOLN': 'Solution',
        'SOLR': 'Solution for Reconstitution',
        'SOSY': 'Solution/Syrup',
        'SUSP': 'Suspension',
        'TABS': 'Tablet',
        'TAB': 'Tablet',
        'TBEC': 'Enteric Coated Tablet',
        'TBDP': 'Disintegrating Tablet',
        'CAPS': 'Capsule',
        'CAP': 'Capsule',
        'CPEP': 'Capsule Extended Release',
        'CREA': 'Cream',
        'OINT': 'Ointment',
        'NEBU': 'Nebulizer Solution',
        'INJ': 'Injection',
        'PACK': 'Packet',
        'SUPP': 'Suppository',
        'GEL': 'Gel',
        'LOTN': 'Lotion',
        'PWDR': 'Powder',
        'AERO': 'Aerosol',
        'SOSY': 'Syrup'
    };

    // Parse drug description to extract components
    static parse(description) {
        if (!description) return null;

        const result = {
            name: '',
            strength: null,
            strengthUnit: null,
            concentration: null,
            route: null,
            routeFull: null,
            form: null,
            formFull: null,
            isConcentration: false
        };

        // Clean up description
        let desc = description.toUpperCase().trim();

        // Extract form (usually at the end)
        for (const [abbr, full] of Object.entries(this.FORMS)) {
            const formRegex = new RegExp(`\\b${abbr}\\b`, 'i');
            if (formRegex.test(desc)) {
                result.form = abbr;
                result.formFull = full;
                break;
            }
        }

        // Extract route
        for (const [abbr, full] of Object.entries(this.ROUTES)) {
            const routeRegex = new RegExp(`\\b${abbr}\\b`, 'i');
            if (routeRegex.test(desc)) {
                result.route = abbr;
                result.routeFull = full;
                break;
            }
        }

        // Extract concentration (e.g., "10 MG/ML", "325 MG/10.15ML", "0.025 MG/24HR")
        const concentrationMatch = desc.match(/(\d+\.?\d*)\s*(MG|MCG|G|MEQ|UNITS?|INT'?L?\s*UNITS?)\s*\/\s*(\d*\.?\d*)\s*(ML|L|HR|24HR|ACT|DOSE)?/i);
        if (concentrationMatch) {
            const amount = parseFloat(concentrationMatch[1]);
            const unit = concentrationMatch[2].replace(/INT'?L?\s*/i, '').toUpperCase();
            const perAmount = concentrationMatch[3] ? parseFloat(concentrationMatch[3]) : 1;
            const perUnit = (concentrationMatch[4] || 'ML').toUpperCase();

            result.concentration = `${amount} ${unit}/${perAmount > 1 ? perAmount : ''}${perUnit}`;
            result.strength = amount;
            result.strengthUnit = unit;
            result.isConcentration = true;
            result.perAmount = perAmount;
            result.perUnit = perUnit;
        } else {
            // Extract simple strength (e.g., "500 MG", "25 MCG", "20 MEQ")
            const strengthMatch = desc.match(/(\d+\.?\d*)\s*(MG|MCG|G|MEQ|UNITS?|%)/i);
            if (strengthMatch) {
                result.strength = parseFloat(strengthMatch[1]);
                result.strengthUnit = strengthMatch[2].toUpperCase();
            }
        }

        // Extract drug name (everything before the first number usually)
        const nameMatch = desc.match(/^([A-Z][A-Z\s\-]+?)(?:\s+\d|$)/);
        if (nameMatch) {
            result.name = nameMatch[1].trim();
        } else {
            result.name = desc.split(/\s+/).slice(0, 2).join(' ');
        }

        return result;
    }

    // Calculate standardized price per unit
    static calculateUnitPrice(item, price) {
        const drugInfo = item.drug_information;
        const parsed = this.parse(item.description);

        if (!drugInfo || !price) return null;

        const packageQty = parseFloat(drugInfo.unit) || 1;
        const packageType = drugInfo.type || 'EA';

        // Price per package unit (EA, ML, etc.)
        const pricePerPackageUnit = price / packageQty;

        // If we have concentration info, calculate price per mg/mcg
        if (parsed && parsed.isConcentration && parsed.strength) {
            // For solutions: price per ML, and calculate per MG
            if (packageType === 'ML' || packageType === 'L') {
                const mlQty = packageType === 'L' ? packageQty * 1000 : packageQty;
                const mgPerMl = parsed.strength / (parsed.perAmount || 1);
                const totalMg = mgPerMl * mlQty;

                return {
                    pricePerMl: price / mlQty,
                    pricePerMg: totalMg > 0 ? price / totalMg : null,
                    totalDose: totalMg,
                    doseUnit: parsed.strengthUnit,
                    packageInfo: `${packageQty} ${packageType}`,
                    concentration: parsed.concentration
                };
            }
        }

        // For tablets/capsules with strength
        if (parsed && parsed.strength && (packageType === 'EA' || parsed.form === 'TABS' || parsed.form === 'CAPS')) {
            const totalDose = parsed.strength * packageQty;
            return {
                pricePerUnit: pricePerPackageUnit,
                pricePerMg: totalDose > 0 ? price / totalDose : null,
                totalDose: totalDose,
                doseUnit: parsed.strengthUnit,
                packageInfo: `${packageQty} ${parsed.formFull || packageType}`,
                strengthPerUnit: `${parsed.strength} ${parsed.strengthUnit}`
            };
        }

        // Default: just return price per package unit
        return {
            pricePerUnit: pricePerPackageUnit,
            packageInfo: `${packageQty} ${packageType}`
        };
    }
}

class HospitalCostItemizer {
    constructor() {
        this.data = null;
        this.cart = [];
        this.priceType = 'gross_charge';
        this.searchTimeout = null;
        this.darkMode = false;

        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        this.loadTheme();
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
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
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
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
    }

    // Dark mode functionality
    loadTheme() {
        const savedTheme = localStorage.getItem('hospitalTheme');
        if (savedTheme === 'dark') {
            this.darkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'light') {
            this.darkMode = false;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.darkMode = true;
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('hospitalTheme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('hospitalTheme', 'light');
        }
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
        }).slice(0, 100); // Limit to 100 results for performance

        this.displaySearchResults(results);
    }

    getItemType(item) {
        const notes = item.standard_charges?.[0]?.additional_generic_notes || '';
        const codes = item.code_information || [];
        const hasNDC = codes.some(c => c.type === 'NDC');
        const hasCPT = codes.some(c => c.type === 'CPT' || c.type === 'HCPCS');
        const hasRC = codes.some(c => c.type === 'RC');

        if (notes.toLowerCase().includes('pharmacy') || hasNDC || item.drug_information) {
            return { type: 'pharmacy', label: 'Rx' };
        }
        if (notes.toLowerCase().includes('room') || item.description?.toLowerCase().includes('room')) {
            return { type: 'room', label: 'Room' };
        }
        if (hasCPT) {
            return { type: 'procedure', label: 'Proc' };
        }
        if (notes.toLowerCase().includes('supply') || hasRC) {
            return { type: 'supply', label: 'Supply' };
        }
        return { type: 'other', label: 'Other' };
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            this.searchResults.innerHTML = '<p class="no-results">No items found matching your search.</p>';
            return;
        }

        const resultsHtml = results.map((item, index) => {
            const price = this.getItemPrice(item);
            const codeInfo = this.getCodeInfo(item);
            const drugInfo = this.getDrugInfoDisplay(item, price);
            const uniqueId = this.generateItemId(item);
            const itemType = this.getItemType(item);
            const unitPriceInfo = DrugParser.calculateUnitPrice(item, price);

            let unitPriceHtml = '';
            if (unitPriceInfo) {
                if (unitPriceInfo.pricePerMg !== null && unitPriceInfo.pricePerMg !== undefined) {
                    unitPriceHtml = `<div class="item-unit-price">${this.formatCurrency(unitPriceInfo.pricePerMg)}/mg</div>`;
                } else if (unitPriceInfo.pricePerMl !== null && unitPriceInfo.pricePerMl !== undefined) {
                    unitPriceHtml = `<div class="item-unit-price">${this.formatCurrency(unitPriceInfo.pricePerMl)}/mL</div>`;
                } else if (unitPriceInfo.pricePerUnit !== null && unitPriceInfo.pricePerUnit !== undefined) {
                    unitPriceHtml = `<div class="item-unit-price">${this.formatCurrency(unitPriceInfo.pricePerUnit)}/ea</div>`;
                }
            }

            return `
                <div class="search-result-item" data-index="${index}">
                    <div class="item-info">
                        <div class="item-description">
                            <span class="item-type-badge ${itemType.type}">${itemType.label}</span>
                            ${this.escapeHtml(item.description)}
                        </div>
                        ${codeInfo ? `<div class="item-code">${codeInfo}</div>` : ''}
                        ${drugInfo}
                    </div>
                    <div class="item-price-container">
                        <div class="item-price">${this.formatCurrency(price)}</div>
                        ${unitPriceHtml}
                    </div>
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

    getDrugInfoDisplay(item, price) {
        const parsed = DrugParser.parse(item.description);
        const drugInfo = item.drug_information;
        const unitPriceInfo = DrugParser.calculateUnitPrice(item, price);

        if (!parsed && !drugInfo) return '';

        let badges = [];

        // Strength/Concentration
        if (parsed?.concentration) {
            badges.push(`<span class="dose-badge strength">${parsed.concentration}</span>`);
        } else if (parsed?.strength && parsed?.strengthUnit) {
            badges.push(`<span class="dose-badge strength">${parsed.strength} ${parsed.strengthUnit}</span>`);
        }

        // Route
        if (parsed?.routeFull) {
            badges.push(`<span class="dose-badge route">${parsed.routeFull}</span>`);
        }

        // Form
        if (parsed?.formFull) {
            badges.push(`<span class="dose-badge form">${parsed.formFull}</span>`);
        }

        // Package info
        if (drugInfo?.unit && drugInfo?.type) {
            badges.push(`<span class="dose-badge package">${drugInfo.unit} ${drugInfo.type}</span>`);
        }

        // Total dose in package
        if (unitPriceInfo?.totalDose && unitPriceInfo?.doseUnit) {
            badges.push(`<span class="dose-badge unit-price">Total: ${unitPriceInfo.totalDose.toFixed(1)} ${unitPriceInfo.doseUnit}</span>`);
        }

        if (badges.length === 0) return '';

        return `<div class="item-dose-info">${badges.join('')}</div>`;
    }

    getItemPrice(item) {
        if (!item.standard_charges || item.standard_charges.length === 0) {
            return 0;
        }
        const charge = item.standard_charges[0];

        // Handle different price structures
        if (this.priceType === 'gross_charge') {
            return charge.gross_charge || charge.minimum || 0;
        } else {
            return charge.discounted_cash || charge.gross_charge * 0.4 || 0;
        }
    }

    getCodeInfo(item) {
        if (!item.code_information || item.code_information.length === 0) {
            return '';
        }
        // Show most relevant codes (NDC for drugs, CPT/HCPCS for procedures)
        const priorityTypes = ['NDC', 'CPT', 'HCPCS', 'CDM', 'RC'];
        const sortedCodes = [...item.code_information].sort((a, b) => {
            const aIdx = priorityTypes.indexOf(a.type);
            const bIdx = priorityTypes.indexOf(b.type);
            return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });

        return sortedCodes
            .slice(0, 2) // Show max 2 codes
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
        return btoa(encodeURIComponent(desc + code)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
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
            const parsed = DrugParser.parse(cartItem.item.description);
            const drugInfo = cartItem.item.drug_information;

            let doseInfo = '';
            if (parsed?.strength && parsed?.strengthUnit) {
                doseInfo = `${parsed.strength} ${parsed.strengthUnit}`;
                if (drugInfo?.unit && drugInfo?.type) {
                    doseInfo += ` × ${drugInfo.unit} ${drugInfo.type}`;
                }
            } else if (drugInfo?.unit && drugInfo?.type) {
                doseInfo = `${drugInfo.unit} ${drugInfo.type}`;
            }

            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-description">${this.escapeHtml(cartItem.item.description)}</div>
                        ${codeInfo ? `<div class="cart-item-code">${codeInfo}</div>` : ''}
                        ${doseInfo ? `<div class="cart-item-dose">${doseInfo}</div>` : ''}
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
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
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
