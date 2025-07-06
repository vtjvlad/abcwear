class Catalog {
    constructor() {
        this.filters = {
            category: '',
            color: '',
            search: '',
            minPrice: '',
            maxPrice: '',
            sort: 'default'
        };
        
        this.currentPage = 1;
        this.productsPerPage = 12;
        this.totalProducts = 0;
        
        this.init();
    }
    
    init() {
        // Инициализация обработчиков событий
        this.initFilterHandlers();
        this.initSortHandler();
        this.initPaginationHandlers();
        
        // Загрузка начальных данных
        this.loadProducts();
        
        // Инициализация SEO фильтров
        this.initSEO();
    }
    
    initFilterHandlers() {
        // Обработчики для категорий
        document.querySelectorAll('.category-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filters.category = checkbox.checked ? checkbox.value : '';
                this.applyFilters();
            });
        });
        
        // Обработчики для цветов
        document.querySelectorAll('.color-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filters.color = checkbox.checked ? checkbox.value : '';
                this.applyFilters();
            });
        });
        
        // Обработчик для поиска
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                this.filters.search = searchInput.value;
                this.applyFilters();
            }, 300));
        }
        
        // Обработчики для цен
        const minPriceInput = document.querySelector('.min-price');
        const maxPriceInput = document.querySelector('.max-price');
        
        if (minPriceInput && maxPriceInput) {
            minPriceInput.addEventListener('change', () => {
                this.filters.minPrice = minPriceInput.value;
                this.applyFilters();
            });
            
            maxPriceInput.addEventListener('change', () => {
                this.filters.maxPrice = maxPriceInput.value;
                this.applyFilters();
            });
        }
        
        // Обработчик для кнопки очистки фильтров
        const clearFiltersBtn = document.querySelector('.clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }
    
    initSortHandler() {
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.filters.sort = sortSelect.value;
                this.applyFilters();
            });
        }
    }
    
    initPaginationHandlers() {
        const pagination = document.querySelector('.pagination');
        if (pagination) {
            pagination.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const page = parseInt(e.target.dataset.page);
                    if (!isNaN(page)) {
                        this.currentPage = page;
                        this.loadProducts();
                    }
                }
            });
        }
    }
    
    initSEO() {
        // Инициализация SEO фильтров
        if (typeof SEOFilters !== 'undefined') {
            this.seoFilters = new SEOFilters();
            this.seoFilters.initURLHandlers();
        }
    }
    
    async loadProducts() {
        try {
            // Показываем индикатор загрузки
            this.showLoading();
            
            // Формируем параметры запроса
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.productsPerPage,
                ...this.filters
            });
            
            // Загружаем продукты
            const response = await fetch(`/api/products?${params}`);
            const data = await response.json();
            
            // Обновляем данные
            this.totalProducts = data.total;
            this.renderProducts(data.products);
            this.updatePagination();
            this.updateProductsCount();
            
            // Обновляем SEO метаданные
            this.updateSEO();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Ошибка при загрузке товаров');
        } finally {
            this.hideLoading();
        }
    }
    
    renderProducts(products) {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = products.map(product => `
            <div class="product-card">
                <a href="/product/${product.id}" class="product-link">
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="product-subtitle">${product.subtitle || ''}</p>
                    <p class="product-price">${product.price} ₽</p>
                </a>
            </div>
        `).join('');
    }
    
    updatePagination() {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.totalProducts / this.productsPerPage);
        let paginationHTML = '';
        
        // Кнопка "Предыдущая"
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    data-page="${this.currentPage - 1}">
                ←
            </button>
        `;
        
        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                paginationHTML += `
                    <button class="${i === this.currentPage ? 'active' : ''}"
                            data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (
                i === this.currentPage - 3 || 
                i === this.currentPage + 3
            ) {
                paginationHTML += '<span>...</span>';
            }
        }
        
        // Кнопка "Следующая"
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    data-page="${this.currentPage + 1}">
                →
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    updateProductsCount() {
        const countElement = document.querySelector('.products-count');
        if (countElement) {
            countElement.textContent = `Найдено товаров: ${this.totalProducts}`;
        }
    }
    
    updateSEO() {
        if (this.seoFilters) {
            this.seoFilters.updatePageMetadata(this.filters);
        }
    }
    
    applyFilters() {
        this.currentPage = 1;
        this.loadProducts();
    }
    
    clearFilters() {
        // Сбрасываем значения фильтров
        this.filters = {
            category: '',
            color: '',
            search: '',
            minPrice: '',
            maxPrice: '',
            sort: 'default'
        };
        
        // Сбрасываем значения в форме
        document.querySelectorAll('.category-filter, .color-filter').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        const searchInput = document.querySelector('.search-input');
        if (searchInput) searchInput.value = '';
        
        const minPriceInput = document.querySelector('.min-price');
        const maxPriceInput = document.querySelector('.max-price');
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';
        
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) sortSelect.value = 'default';
        
        // Применяем изменения
        this.applyFilters();
    }
    
    showLoading() {
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = '<div class="loading">Загрузка...</div>';
        }
    }
    
    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
    
    showError(message) {
        const productsGrid = document.querySelector('.products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = `<div class="error">${message}</div>`;
        }
    }
}

// Вспомогательная функция для debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Инициализация каталога при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.catalog = new Catalog();
}); 