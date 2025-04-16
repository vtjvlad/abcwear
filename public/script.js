document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const loadingIndicator = document.getElementById('loading');
    const filtersContainer = document.getElementById('filters');
    const searchInput = document.getElementById('search');
    const colorFilter = document.getElementById('color-filter');
    const categoryFilter = document.getElementById('category-filter');
    const nameFilter = document.getElementById('name-filter');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const sortFieldSelect = document.getElementById('sort-field');
    const sortOrderSelect = document.getElementById('sort-order');
    const activeFiltersContainer = document.getElementById('active-filters');

    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let currentFilters = {
        color: '',
        category: '',
        name: '',
        search: '',
        minPrice: '',
        maxPrice: '',
        sortField: 'createdAt',
        sortOrder: 'desc'
    };

    // Initialize noUiSlider for price range
    const priceSlider = document.getElementById('price-slider');
    noUiSlider.create(priceSlider, {
        start: [0, 10000],
        connect: true,
        range: {
            'min': 0,
            'max': 10000
        }
    });

    // Update price inputs when slider changes
    priceSlider.noUiSlider.on('update', (values) => {
        minPriceInput.value = Math.round(values[0]);
        maxPriceInput.value = Math.round(values[1]);
        currentFilters.minPrice = minPriceInput.value;
        currentFilters.maxPrice = maxPriceInput.value;
        fetchProducts(1);
    });

    // Update slider when price inputs change
    const updatePriceSlider = debounce(() => {
        const min = parseInt(minPriceInput.value) || 0;
        const max = parseInt(maxPriceInput.value) || 10000;
        priceSlider.noUiSlider.set([min, max]);
        currentFilters.minPrice = minPriceInput.value;
        currentFilters.maxPrice = maxPriceInput.value;
        fetchProducts(1);
    }, 500);

    minPriceInput.addEventListener('input', updatePriceSlider);
    maxPriceInput.addEventListener('input', updatePriceSlider);

    // URL state management
    function updateURL() {
        const params = new URLSearchParams();
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    function loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        Object.keys(currentFilters).forEach(key => {
            const value = params.get(key);
            if (value) {
                currentFilters[key] = value;
                const element = document.getElementById(`${key}-filter`) || document.getElementById(key);
                if (element) element.value = value;
            }
        });
    }

    // Filter counts
    async function updateFilterCounts() {
        try {
            const response = await fetch('/api/products/filter-counts');
            const counts = await response.json();
            
            document.getElementById('color-count').textContent = `(${counts.colors} цветов)`;
            document.getElementById('category-count').textContent = `(${counts.categories} категорий)`;
            document.getElementById('name-count').textContent = `(${counts.names} названий)`;
        } catch (error) {
            console.error('Error updating filter counts:', error);
        }
    }

    // Enhanced filter handling
    function handleFilterChange(type, value) {
        currentFilters[type] = value;
        updateURL();
        updateActiveFilters();
        fetchProducts(1);
    }

    // Загрузка фильтров
    async function loadFilters() {
        try {
            const [colors, categories, names] = await Promise.all([
                fetch('/api/filters/colors').then(res => res.json()),
                fetch('/api/filters/categories').then(res => res.json()),
                fetch('/api/filters/names').then(res => res.json())
            ]);

            // Заполняем фильтры цветов
            colorFilter.innerHTML = '<option value="">Все цвета</option>' +
                colors.map(color => `<option value="${color}">${color}</option>`).join('');

            // Заполняем фильтры категорий
            categoryFilter.innerHTML = '<option value="">Все категории</option>' +
                categories.map(category => `<option value="${category}">${category}</option>`).join('');

            // Заполняем фильтры названий
            nameFilter.innerHTML = '<option value="">Все названия</option>' +
                names.map(name => `<option value="${name}">${name}</option>`).join('');

        } catch (error) {
            console.error('Error loading filters:', error);
            alert('Ошибка загрузки фильтров. Пожалуйста, обновите страницу.');
        }
    }

    // Обновление активных фильтров
    function updateActiveFilters() {
        activeFiltersContainer.innerHTML = '';
        const filters = [];

        if (currentFilters.search) {
            filters.push({
                type: 'search',
                label: `Поиск: ${currentFilters.search}`,
                value: currentFilters.search
            });
        }

        if (currentFilters.color) {
            filters.push({
                type: 'color',
                label: `Цвет: ${currentFilters.color}`,
                value: currentFilters.color
            });
        }

        if (currentFilters.category) {
            filters.push({
                type: 'category',
                label: `Категория: ${currentFilters.category}`,
                value: currentFilters.category
            });
        }

        if (currentFilters.name) {
            filters.push({
                type: 'name',
                label: `Название: ${currentFilters.name}`,
                value: currentFilters.name
            });
        }

        if (currentFilters.minPrice || currentFilters.maxPrice) {
            filters.push({
                type: 'price',
                label: `Цена: ${currentFilters.minPrice || '0'} - ${currentFilters.maxPrice || '∞'}`,
                value: 'price'
            });
        }

        if (filters.length > 0) {
            const clearAllButton = document.createElement('button');
            clearAllButton.className = 'clear-filters';
            clearAllButton.textContent = 'Очистить все';
            clearAllButton.addEventListener('click', clearAllFilters);
            activeFiltersContainer.appendChild(clearAllButton);
        }

        filters.forEach(filter => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `
                ${filter.label}
                <span class="remove" data-type="${filter.type}">&times;</span>
            `;
            tag.querySelector('.remove').addEventListener('click', () => removeFilter(filter.type));
            activeFiltersContainer.appendChild(tag);
        });
    }

    // Удаление фильтра
    function removeFilter(type) {
        switch (type) {
            case 'search':
                searchInput.value = '';
                currentFilters.search = '';
                break;
            case 'color':
                colorFilter.value = '';
                currentFilters.color = '';
                break;
            case 'category':
                categoryFilter.value = '';
                currentFilters.category = '';
                break;
            case 'name':
                nameFilter.value = '';
                currentFilters.name = '';
                break;
            case 'price':
                minPriceInput.value = '';
                maxPriceInput.value = '';
                currentFilters.minPrice = '';
                currentFilters.maxPrice = '';
                break;
        }
        fetchProducts(1);
    }

    // Очистка всех фильтров
    function clearAllFilters() {
        searchInput.value = '';
        colorFilter.value = '';
        categoryFilter.value = '';
        nameFilter.value = '';
        minPriceInput.value = '';
        maxPriceInput.value = '';
        sortFieldSelect.value = 'createdAt';
        sortOrderSelect.value = 'desc';

        currentFilters = {
            color: '',
            category: '',
            name: '',
            search: '',
            minPrice: '',
            maxPrice: '',
            sortField: 'createdAt',
            sortOrder: 'desc'
        };

        fetchProducts(1);
    }

    // Загрузка продуктов
    async function fetchProducts(page = 1, filters = currentFilters) {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        loadingIndicator.style.display = 'block';
        
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...filters
            });

            console.log('Fetching products with params:', queryParams.toString());
            const response = await fetch(`/api/products?${queryParams.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            
            if (page === 1) {
                productsContainer.innerHTML = '';
            }

            if (!data.products || data.products.length === 0) {
                if (page === 1) {
                    productsContainer.innerHTML = `
                        <div class="no-products">
                            <p>Товары не найдены</p>
                            <p>Попробуйте изменить параметры поиска</p>
                        </div>
                    `;
                }
                hasMore = false;
                return;
            }

            data.products.forEach(product => {
                try {
                    if (product && typeof product === 'object') {
                        const productCard = createProductCard(product);
                        if (productCard) {
                            productsContainer.appendChild(productCard);
                        }
                    }
                } catch (error) {
                    console.error('Error creating product card:', error, product);
                }
            });

            hasMore = data.currentPage < data.totalPages;
            currentPage = page;
            
        } catch (error) {
            console.error('Error fetching products:', error);
            if (page === 1) {
                productsContainer.innerHTML = `
                    <div class="error-message">
                        <p>Ошибка загрузки товаров</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }

    // Создание карточки продукта
    function createProductCard(product) {
        try {
            const cardElement = document.createElement('div');
            cardElement.className = 'product-card';
            
            // Create image container with carousel
            const imageContainerElement = document.createElement('div');
            imageContainerElement.className = 'product-image-container';
            
            const mainImageElement = document.createElement('img');
            mainImageElement.className = 'product-image';
            mainImageElement.src = product.imageData?.imgMain || product.images?.[0] || 'placeholder.jpg';
            mainImageElement.alt = product.info?.name || 'Товар';
            
            const carouselElement = document.createElement('div');
            carouselElement.className = 'image-carousel';
            
            const images = product.imageData?.images || product.images || [];
            images.forEach((image, index) => {
                const carouselImage = document.createElement('img');
                carouselImage.className = 'carousel-image';
                carouselImage.src = image;
                carouselImage.alt = `${product.info?.name || 'Товар'} - Изображение ${index + 1}`;
                carouselImage.dataset.index = index;
                
                if (index === 0) {
                    carouselImage.classList.add('active');
                }
                
                carouselImage.addEventListener('click', () => {
                    mainImageElement.src = image;
                    mainImageElement.style.opacity = '0';
                    setTimeout(() => {
                        mainImageElement.style.opacity = '1';
                    }, 50);
                    
                    document.querySelectorAll('.carousel-image').forEach(img => {
                        img.classList.remove('active');
                    });
                    carouselImage.classList.add('active');
                });
                
                carouselElement.appendChild(carouselImage);
            });
            
            imageContainerElement.appendChild(mainImageElement);
            if (images.length > 1) {
                imageContainerElement.appendChild(carouselElement);
            }
            
            // Create product info
            const infoElement = document.createElement('div');
            infoElement.className = 'product-info';
            
            const nameElement = document.createElement('h3');
            nameElement.textContent = product.info?.name || 'Название не указано';
            
            const priceElement = document.createElement('p');
            priceElement.className = 'price';
            const currentPrice = product.price?.self?.UAH?.currentPrice || '0';
            const initialPrice = product.price?.self?.UAH?.initialPrice;
            priceElement.innerHTML = `<span class="current-price">${currentPrice} ₴</span>` + 
                (initialPrice ? `<span class="initial-price">${initialPrice} ₴</span>` : '');
            
            // Create color options
            const colorOptionsElement = document.createElement('div');
            colorOptionsElement.className = 'color-options';
            
            const color = product.info?.color;
            if (color?.labelColor) {
                const colorIndicator = document.createElement('div');
                colorIndicator.className = 'color-indicator';
                colorIndicator.style.backgroundColor = color.hex || color.labelColor;
                colorIndicator.dataset.color = color.labelColor;
                colorIndicator.classList.add('active');
                colorOptionsElement.appendChild(colorIndicator);
            }
            
            // Create view details button
            const viewDetailsElement = document.createElement('button');
            viewDetailsElement.className = 'view-details';
            viewDetailsElement.textContent = 'Подробнее';
            viewDetailsElement.addEventListener('click', () => {
                window.location.href = `/product/${product._id}`;
            });
            
            // Assemble the card
            infoElement.appendChild(nameElement);
            infoElement.appendChild(priceElement);
            infoElement.appendChild(colorOptionsElement);
            infoElement.appendChild(viewDetailsElement);
            
            cardElement.appendChild(imageContainerElement);
            cardElement.appendChild(infoElement);
            
            return cardElement;
        } catch (error) {
            console.error('Error creating product card:', error);
            return null;
        }
    }

    // Обработка прокрутки
    function handleScroll() {
        if (isLoading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            fetchProducts(currentPage + 1, currentFilters);
        }
    }

    // Event listeners for filters
    searchInput.addEventListener('input', debounce(() => {
        handleFilterChange('search', searchInput.value);
    }, 500));

    colorFilter.addEventListener('change', () => {
        handleFilterChange('color', colorFilter.value);
    });

    categoryFilter.addEventListener('change', () => {
        handleFilterChange('category', categoryFilter.value);
    });

    nameFilter.addEventListener('change', () => {
        handleFilterChange('name', nameFilter.value);
    });

    sortFieldSelect.addEventListener('change', () => {
        handleFilterChange('sortField', sortFieldSelect.value);
    });

    sortOrderSelect.addEventListener('change', () => {
        handleFilterChange('sortOrder', sortOrderSelect.value);
    });

    // Функция debounce для оптимизации частых вызовов
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

    // Initialize
    loadFromURL();
    loadFilters();
    updateFilterCounts();
    fetchProducts(1);

    // Обновление активных фильтров при изменении
    const filterInputs = [searchInput, colorFilter, categoryFilter, nameFilter, minPriceInput, maxPriceInput];
    filterInputs.forEach(input => {
        input.addEventListener('change', updateActiveFilters);
    });

    // События
    window.addEventListener('scroll', handleScroll);
});

// Функция для показа деталей продукта
function showProductDetails(productId) {
    // Здесь можно добавить логику для показа модального окна с деталями продукта
    console.log('Show details for product:', productId);
}