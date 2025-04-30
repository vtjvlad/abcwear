        // Get product ID from URL
        const productId = window.location.pathname.split('/').pop();

        // Function to load product data
        async function loadProductData() {
            try {
                const response = await fetch(`/api/products/${productId}`);
                const product = await response.json();

                // Update page title
                document.title = `ABC Wear - ${product.info.name}`;

                // Update product title and subtitle
                document.getElementById('product-title').textContent = product.info.name;
                document.getElementById('product-subtitle').textContent = product.info.subtitle;

                // Update price
                const priceContainer = document.getElementById('product-price');
                priceContainer.innerHTML = `
                    ${product.price.self.UAH.currentPrice} грн
                    ${product.price.self.UAH.initialPrice ? 
                        `<span class="product-old-price">${product.price.self.UAH.initialPrice} грн</span>` : ''}
                    ${product.price.self.UAH.discount ? 
                        `<span class="product-discount">-${product.price.self.UAH.discount}%</span>` : ''}
                `;

                // Update images
                const mainImage = document.getElementById('main-image');
                const thumbnailList = document.getElementById('thumbnail-list');
                
                if (product.imageData.imgMain) {
                    mainImage.src = product.imageData.imgMain;
                    thumbnailList.innerHTML = `
                        <img src="${product.imageData.imgMain}" alt="Main view" class="thumbnail active">
                        ${product.imageData.images.map((img, index) => `
                            <img src="${img}" alt="View ${index + 1}" class="thumbnail">
                        `).join('')}
                    `;
                }

                // Update sizes
                const sizeGrid = document.getElementById('size-grid');
                if (product.sizes) {
                    sizeGrid.innerHTML = product.sizes.map(size => `
                        <div class="size-option">${size}</div>
                    `).join('');
                }

                // Update colors
                const colorGrid = document.getElementById('color-grid');
                if (product.variants) {
                    colorGrid.innerHTML = product.variants.map(variant => `
                        <div class="color-option" 
                             style="background-color: ${variant.info.color.hex};"
                             data-variant-id="${variant._id}">
                        </div>
                    `).join('');
                }

                // Update description
                document.getElementById('product-description').textContent = product.info.discription;

                // Update specifications
                const specsTable = document.getElementById('specs-table');
                if (product.specifications) {
                    specsTable.innerHTML = Object.entries(product.specifications)
                        .map(([key, value]) => `
                            <tr>
                                <td>${key}</td>
                                <td>${value}</td>
                            </tr>
                        `).join('');
                }

                // Add event listeners
                addEventListeners();
            } catch (error) {
                console.error('Error loading product:', error);
                document.getElementById('product-title').textContent = 'Ошибка загрузки товара';
            }
        }

        // Function to add event listeners
        function addEventListeners() {
            // Gallery functionality
            const thumbnails = document.querySelectorAll('.thumbnail');
            const mainImage = document.getElementById('main-image');

            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    mainImage.src = thumb.src;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            // Size selector functionality
            const sizeOptions = document.querySelectorAll('.size-option');
            sizeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    sizeOptions.forEach(s => s.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });

            // Color selector functionality
            const colorOptions = document.querySelectorAll('.color-option');
            colorOptions.forEach(option => {
                option.addEventListener('click', () => {
                    colorOptions.forEach(c => c.classList.remove('selected'));
                    option.classList.add('selected');
                    // Here you can add logic to update product variant
                });
            });

            // Add to cart button
            document.getElementById('add-to-cart').addEventListener('click', () => {
                const selectedSize = document.querySelector('.size-option.selected');
                const selectedColor = document.querySelector('.color-option.selected');
                
                if (!selectedSize) {
                    alert('Пожалуйста, выберите размер');
                    return;
                }

                // Here you can add logic to add product to cart
                console.log('Adding to cart:', {
                    productId,
                    size: selectedSize.textContent,
                    color: selectedColor ? selectedColor.dataset.variantId : null
                });
            });

            // Add to favorites button
            document.getElementById('add-to-favorites').addEventListener('click', () => {
                // Here you can add logic to add product to favorites
                console.log('Adding to favorites:', productId);
            });
        }

        // Load product data when page loads
        loadProductData();
