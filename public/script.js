document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    const loadingIndicator = document.getElementById('loading');

    let products = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let currentSearchTerm = '';
    let currentSortValue = 'price-asc';

    // Fetch products from API
    async function fetchProducts(page = 1, searchTerm = '', sortValue = 'price-asc') {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        loadingIndicator.style.display = 'block';
        
        try {
            const response = await fetch(`/api/products?page=${page}&limit=12`);
            const data = await response.json();
            
            if (page === 1) {
                products = data.products;
            } else {
                products = [...products, ...data.products];
            }
            
            hasMore = data.hasMore;
            currentPage = page;
            
            displayProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
    }

    // Display products
    function displayProducts(productsToDisplay) {
        if (currentPage === 1) {
            productsContainer.innerHTML = '';
        }
        
        productsToDisplay.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
            productCard.innerHTML = `
                <img src="${product.imageData.imgMain || product.imageData.portraitURL}" 
                     alt="${product.info.name}" 
                     class="product-image">
                <div class="product-info">
                    <h3 class="product-name">${product.info.name}</h3>
                    <p class="product-price">
                        ${product.price.self.UAH.currentPrice} ${product.price.self.currency}
                    </p>
                    <div class="product-color" 
                         style="background-color: ${product.info.color.hex}">
                    </div>
                </div>
            `;
            
            productsContainer.appendChild(productCard);
        });
    }

    // Handle scroll
    function handleScroll() {
        if (isLoading || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            fetchProducts(currentPage + 1, currentSearchTerm, currentSortValue);
        }
    }

    // Filter and sort products
    function filterAndSortProducts() {
        currentSearchTerm = searchInput.value.toLowerCase();
        currentSortValue = sortSelect.value;
        currentPage = 1;
        hasMore = true;
        fetchProducts(1, currentSearchTerm, currentSortValue);
    }

    // Event listeners
    searchInput.addEventListener('input', filterAndSortProducts);
    sortSelect.addEventListener('change', filterAndSortProducts);
    window.addEventListener('scroll', handleScroll);

    // Initial load
    fetchProducts();
}); 