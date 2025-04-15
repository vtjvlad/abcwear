document.addEventListener('DOMContentLoaded', () => {
    let currentPage = 1;
    let totalPages = 1;
    const limit = 42;
    let isLoading = false;
    let searchTimeout;
    let currentProduct = null;

    const grid = document.getElementById('product-grid');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const filterForm = document.getElementById('filter-form');
    const searchInput = document.getElementById('search');
    const productTypeSelect = document.getElementById('productType');
    const colorSelect = document.getElementById('color');
    const isNewCheckbox = document.getElementById('isNew');
    const resetButton = document.getElementById('reset-filters');
    const sortBySelect = document.getElementById('sortBy');
    const priceRange = document.getElementById('priceRange');
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    const modal = document.getElementById('quickViewModal');
    const closeModal = document.querySelector('.close-modal');

    // Price range slider
    priceRange.addEventListener('input', (e) => {
        const value = e.target.value;
        maxPriceValue.textContent = value;
        applyFilters();
    });

    // Modal functionality
    function openModal(product) {
        currentProduct = product;
        document.getElementById('modalProductImage').src = product.imageData.portraitURL || 'https://via.placeholder.com/400';
        document.getElementById('modalProductName').textContent = product.info.name || 'Без названия';
        document.getElementById('modalProductPrice').textContent = `${product.price.self.selfUAH.current20 || 0} UAH`;
        document.getElementById('modalProductDescription').textContent = product.info.subtitle || '';
        modal.style.display = 'block';
    }

    function closeModalHandler() {
        modal.style.display = 'none';
        currentProduct = null;
    }

    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });

    // Add to cart functionality
    document.querySelector('.add-to-cart-button').addEventListener('click', () => {
        if (currentProduct) {
            alert(`Товар "${currentProduct.info.name}" добавлен в корзину`);
        }
    });

    // View details functionality
    document.querySelector('.view-details-button').addEventListener('click', () => {
        if (currentProduct) {
            window.location.href = `/product/${currentProduct._id}`;
        }
    });

    // Skeleton loading
    function showSkeletonLoading() {
        grid.innerHTML = '';
        for (let i = 0; i < limit; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'product-card skeleton';
            skeleton.innerHTML = `
                <div class="skeleton-image"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-price"></div>
                <div class="skeleton-type"></div>
            `;
            grid.appendChild(skeleton);
        }
    }

    // Get filters
    function getFilters() {
        const filters = {
            search: searchInput.value.trim(),
            minPrice: 0,
            maxPrice: priceRange.value,
            productType: productTypeSelect.value,
            color: colorSelect.value,
            isNew: isNewCheckbox.checked ? 'true' : '',
            sortBy: sortBySelect.value
        };

        return filters;
    }

    // Load products
    async function loadProducts(page, filters = {}) {
        if (isLoading || currentPage > totalPages) return;

        const cacheKey = `products_page_${page}_${JSON.stringify(filters)}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const data = JSON.parse(cached);
            renderProducts(data.products);
            totalPages = data.totalPages;
            currentPage++;
            return;
        }

        isLoading = true;
        loading.style.display = 'block';
        errorDiv.textContent = '';
        showSkeletonLoading();

        try {
            const query = new URLSearchParams({ page, limit });
            Object.entries(filters).forEach(([key, value]) => {
                if (value) query.append(key, value);
            });

            window.history.replaceState({}, '', `${window.location.pathname}?${query}`);

            const response = await fetch(`/api/products?${query}`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);

            const data = await response.json();
            if (!data.products || !Array.isArray(data.products)) {
                throw new Error('Invalid products data');
            }

            totalPages = data.totalPages || 1;
            renderProducts(data.products);
            localStorage.setItem(cacheKey, JSON.stringify(data));

            currentPage++;
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            errorDiv.textContent = 'Ошибка при загрузке товаров. Пожалуйста, попробуйте позже.';
        } finally {
            isLoading = false;
            loading.style.display = 'none';
        }
    }

    // Render products
    function renderProducts(products) {
        grid.innerHTML = '';
        products.forEach((product, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <img loading="lazy" src="${product.imageData.portraitURL || 'https://via.placeholder.com/250'}" alt="${product.info.name || 'Без названия'}">
                <h3>${product.info.name || 'Без названия'}</h3>
                <p class="price">${product.price.self.selfUAH.current20 || 0} UAH</p>
                <p class="product-type">${product.data.productType || 'Не указан'}</p>
                <p>${product.info.color.labelColor || 'Не указан'}</p>
            `;
            card.addEventListener('click', () => openModal(product));
            grid.appendChild(card);
        });
    }

    // Apply filters
    function applyFilters() {
        currentPage = 1;
        totalPages = 1;
        localStorage.clear();
        loadProducts(currentPage, getFilters());
    }

    // Debounce for search
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // Event listeners
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
    });

    searchInput.addEventListener('input', debounce(applyFilters, 500));
    productTypeSelect.addEventListener('change', applyFilters);
    colorSelect.addEventListener('change', applyFilters);
    isNewCheckbox.addEventListener('change', applyFilters);
    sortBySelect.addEventListener('change', applyFilters);

    resetButton.addEventListener('click', () => {
        filterForm.reset();
        priceRange.value = 10000;
        maxPriceValue.textContent = '10000';
        applyFilters();
    });

    // Infinite scroll
    window.onscroll = () => {
        if (isLoading || currentPage > totalPages) return;

        const scrollPosition = window.scrollY + window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;

        if (scrollPosition >= pageHeight - 400) {
            loadProducts(currentPage, getFilters());
        }
    };

    // Initialize
    loadProducts(currentPage, getFilters());
}); 