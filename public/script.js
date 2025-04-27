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

    let allProducts = [];
    const CARD_HEIGHT = 420; // приблизна висота картки (px)
    const VISIBLE_COUNT = 18; // скільки карток рендерити одночасно (екран + запас)
    let scrollTopCache = 0;
    let selectedCategory = 'all';

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
            const [colors, categories] = await Promise.all([
                fetch('/api/filters/colors').then(res => res.json()),
                fetch('/api/filters/categories').then(res => res.json())
            ]);

            // Заполняем фильтр цветов
            colorFilter.innerHTML = '<option value="">Все цвета</option>' +
                colors.map(color => `<option value="${color}">${color}</option>`).join('');

            // Заполняем фильтр категорий
            categoryFilter.innerHTML = '<option value="">Все категории</option>' +
                categories.map(category => `<option value="${category}">${category}</option>`).join('');

            // Обновляем счетчики
            document.getElementById('color-count').textContent = `(${colors.length} цветов)`;
            document.getElementById('category-count').textContent = `(${categories.length} категорий)`;

        } catch (error) {
            console.error('Error loading filters:', error);
            alert('Ошибка загрузки фильтров. Пожалуйста, обновите страницу.');
        }
    }

    // Модальное окно фильтров
    const filtersModal = document.getElementById('filters-modal');
    const openFiltersBtn = document.getElementById('open-filters');
    const closeFiltersBtn = document.getElementById('close-filters');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const activeFiltersCount = document.getElementById('active-filters-count');

    // Открытие модального окна
    openFiltersBtn.addEventListener('click', () => {
        filtersModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна
    function closeModal() {
        filtersModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    closeFiltersBtn.addEventListener('click', closeModal);
    filtersModal.addEventListener('click', (e) => {
        if (e.target === filtersModal) {
            closeModal();
        }
    });

    // Применение фильтров
    applyFiltersBtn.addEventListener('click', () => {
        closeModal();
        fetchProducts(1);
    });

    // Обновление счетчика активных фильтров
    function updateActiveFiltersCount() {
        const activeFilters = document.querySelectorAll('.filter-tag');
        const count = activeFilters.length;
        activeFiltersCount.textContent = count;
        activeFiltersCount.style.display = count > 0 ? 'block' : 'none';
    }

    // Обновляем функцию updateActiveFilters
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

        updateActiveFiltersCount();
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

    // Создание карточки продукта
    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';

        // Создаем контейнер для изображения
        const imageContainer = document.createElement('div');
        imageContainer.className = 'product-image-container loading';

        // Создаем индикатор загрузки изображения
        const imageLoading = document.createElement('div');
        imageLoading.className = 'image-loading';
        imageLoading.innerHTML = '<div class="spinner"></div>';
        imageContainer.appendChild(imageLoading);

        // Создаем основное изображение с поддержкой WebP
        const mainImage = document.createElement('img');
        mainImage.className = 'product-image loading';
        mainImage.loading = "lazy"; // Добавляем атрибут для ленивой загрузки
        mainImage.addEventListener('load', () => {
            imageContainer.classList.remove('loading');
            mainImage.classList.remove('loading');
            imageLoading.style.display = 'none';
        });
        mainImage.addEventListener('error', () => {
            imageContainer.classList.remove('loading');
            mainImage.classList.remove('loading');
            imageLoading.style.display = 'none';
            mainImage.src = 'placeholder.jpg'; // Замените на путь к вашему изображению-заглушке
        });
        
        // Попытка использовать WebP, если доступен
        const imgSrc = product.imageData?.imgMain || product.imageData?.images?.[0] || '';
        // Проверяем, если URL изображения заканчивается на jpg/jpeg/png, пробуем загрузить WebP версию
        if (imgSrc.match(/\.(jpg|jpeg|png)$/i)) {
            checkWebpSupport().then(supportsWebp => {
                if (supportsWebp) {
                    // Пробуем WebP версию того же изображения
                    const webpUrl = imgSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                    // Предзагрузка для проверки существования WebP
                    const tempImg = new Image();
                    tempImg.onload = () => { mainImage.src = webpUrl; };
                    tempImg.onerror = () => { mainImage.src = imgSrc; }; 
                    tempImg.src = webpUrl;
                } else {
                    mainImage.src = imgSrc;
                }
            });
        } else {
            mainImage.src = imgSrc;
        }
        
        mainImage.alt = product.info?.name || '';

        imageContainer.appendChild(mainImage);
        card.appendChild(imageContainer);

        // Создаем контейнер для информации о продукте
        const infoContainer = document.createElement('div');
        infoContainer.className = 'product-info';

        // Добавляем название продукта
        const nameElement = document.createElement('h3');
        nameElement.className = 'product-name';
        nameElement.textContent = product.info?.name || '';
        infoContainer.appendChild(nameElement);

        // Добавляем подзаголовок, если есть
        if (product.info?.subtitle) {
            const subtitleElement = document.createElement('p');
            subtitleElement.className = 'product-subtitle';
            subtitleElement.textContent = product.info.subtitle;
            infoContainer.appendChild(subtitleElement);
        }

        // Добавляем цену
        const priceContainer = document.createElement('div');
        priceContainer.className = 'price-container';
        
        const currentPriceElement = document.createElement('span');
        currentPriceElement.className = 'current-price';
        currentPriceElement.textContent = `${product.price?.self?.UAH?.currentPrice || 0} ₴`;
        priceContainer.appendChild(currentPriceElement);

        if (product.price?.self?.UAH?.initialPrice && 
            product.price.self.UAH.initialPrice > product.price.self.UAH.currentPrice) {
            const initialPriceElement = document.createElement('span');
            initialPriceElement.className = 'initial-price';
            initialPriceElement.textContent = `${product.price.self.UAH.initialPrice} ₴`;
            priceContainer.appendChild(initialPriceElement);
        }

        infoContainer.appendChild(priceContainer);

        // Добавляем переключатели цветов
        if (product.variants && product.variants.length > 0) {
            const colorSwitchers = document.createElement('div');
            colorSwitchers.className = 'color-switchers';

            // Добавляем основной цвет
            const mainColorSwitcher = document.createElement('div');
            mainColorSwitcher.className = 'color-switcher active';
            const mainHexColor = product.info?.color?.hex || '#FFFFFF';
            mainColorSwitcher.style.backgroundColor = mainHexColor.startsWith('#') ? mainHexColor : `#${mainHexColor}`;
            mainColorSwitcher.title = product.info?.color?.labelColor || '';
            mainColorSwitcher.addEventListener('click', () => {
                updateActiveColor(colorSwitchers, mainColorSwitcher);
                imageContainer.classList.add('loading');
                imageLoading.style.display = 'flex';
                mainImage.classList.add('loading');
                mainImage.src = product.imageData?.imgMain || product.imageData?.images?.[0] || '';
                updatePrice(priceContainer, product.price?.self?.UAH);
            });
            colorSwitchers.appendChild(mainColorSwitcher);

            // Добавляем цвета вариантов
            product.variants.forEach(variant => {
                const colorSwitcher = document.createElement('div');
                colorSwitcher.className = 'color-switcher';
                const hexColor = variant.info?.color?.hex || '#FFFFFF';
                colorSwitcher.style.backgroundColor = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
                colorSwitcher.title = variant.info?.color?.labelColor || '';
                colorSwitcher.addEventListener('click', () => {
                    updateActiveColor(colorSwitchers, colorSwitcher);
                    imageContainer.classList.add('loading');
                    imageLoading.style.display = 'flex';
                    mainImage.classList.add('loading');
                    mainImage.src = variant.imageData?.imgMain || variant.imageData?.images?.[0] || '';
                    updatePrice(priceContainer, variant.price?.self?.UAH);
                });
                colorSwitchers.appendChild(colorSwitcher);
            });

            infoContainer.appendChild(colorSwitchers);
        }

        // Добавляем селектор размера
        const sizeSelector = document.createElement('select');
        sizeSelector.className = 'size-selector';
        sizeSelector.innerHTML = `
            <option value="">Выберите размер</option>
            <option value="4Y-5.5Y">4Y-5.5Y / W5.5-7</option>
            <option value="6Y-7.5Y">6Y-7.5Y / W7.5-9</option>
            <option value="8Y-9.5Y">8Y-9.5Y / W9.5-11</option>
        `;
        infoContainer.appendChild(sizeSelector);

        // Добавляем кнопки действий
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'product-actions';

        const detailsButton = document.createElement('button');
        detailsButton.className = 'action-button details-button';
        detailsButton.textContent = 'Подробнее';
        detailsButton.addEventListener('click', () => {
            window.location.href = `/product/${product._id}`;
        });

        const cartButton = document.createElement('button');
        cartButton.className = 'action-button cart-button';
        cartButton.textContent = 'В корзину';
        cartButton.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart(product);
        });

        // Добавляем кнопки для шаринга в соцсети
        const shareButton = document.createElement('button');
        shareButton.className = 'action-button share-button';
        shareButton.innerHTML = '<span class="share-icon">&#128279;</span>';
        shareButton.title = 'Поделиться';
        shareButton.addEventListener('click', () => {
            showShareOptions(product);
        });

        actionsContainer.appendChild(detailsButton);
        actionsContainer.appendChild(cartButton);
        actionsContainer.appendChild(shareButton);
        infoContainer.appendChild(actionsContainer);

        card.appendChild(infoContainer);
        return card;
    }

    // Вспомогательная функция для обновления активного цвета
    function updateActiveColor(container, activeElement) {
        container.querySelectorAll('.color-switcher').forEach(el => {
            el.classList.remove('active');
        });
        activeElement.classList.add('active');
    }

    // Вспомогательная функция для обновления цены
    function updatePrice(container, price) {
        const currentPrice = container.querySelector('.current-price');
        const initialPrice = container.querySelector('.initial-price');
        
        if (currentPrice) {
            currentPrice.textContent = `${price?.currentPrice || 0} ₴`;
        }
        
        if (initialPrice) {
            if (price?.initialPrice && price.initialPrice > price.currentPrice) {
                initialPrice.textContent = `${price.initialPrice} ₴`;
                initialPrice.style.display = 'inline';
            } else {
                initialPrice.style.display = 'none';
            }
        }
    }

    function renderVisibleProducts() {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const containerTop = productsContainer.offsetTop;
        // Діагностика: виводимо всі productType
        console.log('productTypes:', allProducts.map(p => p.data?.productType));
        // Фільтруємо товари по вибраній категорії (гнучко, по частковому співпадінню)
        let filteredProducts = selectedCategory === 'all'
            ? allProducts
            : allProducts.filter(p => (p.data?.productType || '').toLowerCase().includes(selectedCategory.toLowerCase()));
        const startIdx = Math.max(0, Math.floor((scrollTop - containerTop) / CARD_HEIGHT) - 3);
        const endIdx = Math.min(filteredProducts.length, startIdx + VISIBLE_COUNT);
        productsContainer.innerHTML = '';
        const topSpacer = document.createElement('div');
        topSpacer.style.height = (startIdx * CARD_HEIGHT) + 'px';
        productsContainer.appendChild(topSpacer);
        for (let i = startIdx; i < endIdx; i++) {
            const card = createProductCard(filteredProducts[i]);
            productsContainer.appendChild(card);
        }
        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = ((filteredProducts.length - endIdx) * CARD_HEIGHT) + 'px';
        productsContainer.appendChild(bottomSpacer);
    }

    // Оновлений fetchProducts для зберігання всіх товарів у масиві
    async function fetchProducts(page = 1) {
        if (isLoading) return;
        isLoading = true;
        loadingIndicator.style.display = 'block';
        if (page === 1) {
            allProducts = [];
            hasMore = true;
        }
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: '24', // більше для плавності
                ...currentFilters
            });
            const response = await fetch(`/api/products?${queryParams.toString()}`);
            const data = await response.json();
            if (data.products && data.products.length > 0) {
                data.products.forEach(productGroup => {
                    const mainProduct = productGroup[0];
                    if (!mainProduct) return;
                    const productWithVariants = {
                        ...mainProduct,
                        variants: productGroup.slice(1)
                    };
                    allProducts.push(productWithVariants);
                });
                currentPage = page;
                hasMore = page < data.totalPages;
                renderVisibleProducts();
            } else if (page === 1) {
                productsContainer.innerHTML = '<div class="no-products">Товари не знайдені</div>';
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            if (page === 1) {
                productsContainer.innerHTML = '<div class="error-message">Помилка завантаження товарів</div>';
            }
            hasMore = false;
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }

    // Оновлений handleScroll для віртуалізації
    function handleScroll() {
        if (isLoading || !hasMore) return;
        renderVisibleProducts();
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 500) {
            fetchProducts(currentPage + 1);
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

    // Додаю обробник подій для вкладок категорій
    const categoryTabs = document.getElementById('category-tabs');
    if (categoryTabs) {
        categoryTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
                e.target.classList.add('active');
                selectedCategory = e.target.getAttribute('data-category');
                renderVisibleProducts();
            }
        });
    }

    // Проверка поддержки WebP браузером
    function checkWebpSupport() {
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = () => resolve(true);
            webP.onerror = () => resolve(false);
            webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
        });
    }

    // Функция добавления товара в корзину
    function addToCart(product) {
        // Получаем текущую корзину из localStorage или создаем новую
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Проверяем, есть ли товар уже в корзине
        const existingItemIndex = cart.findIndex(item => item._id === product._id);
        
        if (existingItemIndex >= 0) {
            // Если товар уже в корзине, увеличиваем количество
            cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
        } else {
            // Если товара нет в корзине, добавляем его
            cart.push({
                _id: product._id,
                name: product.info?.name || '',
                price: product.price?.self?.UAH?.currentPrice || 0,
                image: product.imageData?.imgMain || product.imageData?.images?.[0] || '',
                quantity: 1
            });
        }
        
        // Сохраняем корзину в localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Обновляем счетчик товаров в корзине
        updateCartCount();
        
        // Показываем уведомление
        showNotification('Товар добавлен в корзину');
    }

    // Функция обновления счетчика товаров в корзине
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Находим элемент для отображения количества товаров
        const cartCountElement = document.querySelector('.cart-count');
        
        if (cartCountElement) {
            cartCountElement.textContent = totalItems;
            cartCountElement.style.display = totalItems > 0 ? 'block' : 'none';
        }
    }

    // Функция для отображения уведомления
    function showNotification(message) {
        // Проверяем, существует ли уже контейнер для уведомлений
        let notificationContainer = document.getElementById('notification-container');
        
        if (!notificationContainer) {
            // Если контейнера нет, создаем его
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Добавляем уведомление в контейнер
        notificationContainer.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Функция для отображения опций шаринга
    function showShareOptions(product) {
        // Создаем URL для шаринга
        const shareUrl = encodeURIComponent(`${window.location.origin}/product/${product._id}`);
        const shareTitle = encodeURIComponent(product.info?.name || 'Интересный товар');
        
        // Создаем модальное окно для шаринга
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        
        modal.innerHTML = `
            <div class="share-modal-content">
                <span class="share-modal-close">&times;</span>
                <h3>Поделиться товаром</h3>
                <div class="share-buttons">
                    <a href="https://telegram.me/share/url?url=${shareUrl}&text=${shareTitle}" target="_blank" class="share-button telegram">
                        <span>Telegram</span>
                    </a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="share-button facebook">
                        <span>Facebook</span>
                    </a>
                    <a href="viber://forward?text=${shareTitle}%20${shareUrl}" class="share-button viber">
                        <span>Viber</span>
                    </a>
                    <a href="https://twitter.com/share?url=${shareUrl}&text=${shareTitle}" target="_blank" class="share-button twitter">
                        <span>Twitter</span>
                    </a>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно на страницу
        document.body.appendChild(modal);
        
        // Добавляем обработчик закрытия
        const closeButton = modal.querySelector('.share-modal-close');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Закрытие при клике вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Инициализация счетчика корзины при загрузке страницы
    updateCartCount();
});

// Функция для показа деталей продукта
function showProductDetails(productId) {
    // Здесь можно добавить логику для показа модального окна с деталями продукта
    console.log('Show details for product:', productId);
}