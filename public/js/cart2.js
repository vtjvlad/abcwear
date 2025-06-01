        // Функция для обновления индикатора корзины
        function updateCartBadge(count) {
            const badges = document.querySelectorAll('.cart-badge');
            badges.forEach(badge => {
                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.add('visible');
                    badge.classList.add('pulse');
                    setTimeout(() => badge.classList.remove('pulse'), 300);
                } else {
                    badge.classList.remove('visible');
                }
            });
        }

        // Функция для загрузки корзины
        async function loadCart() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showEmptyCart('Для просмотра корзины необходимо авторизоваться');
                    updateCartBadge(0);
                    return;
                }

                const response = await fetch('/api/cart', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Ошибка при загрузке корзины');
                }

                const cart = await response.json();
                renderCart(cart);
                updateCartBadge(cart.items ? cart.items.length : 0);
            } catch (error) {
                console.error('Ошибка:', error);
                showEmptyCart('Ошибка при загрузке корзины');
                updateCartBadge(0);
            }
        }

        // Функция для отображения пустой корзины
        function showEmptyCart(message) {
            const cartContent = document.getElementById('cartContent');
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <h2>${message}</h2>
                    <p>Перейдите в каталог, чтобы добавить товары в корзину</p>
                    <a href="/catalog" class="btn btn-primary">Перейти в каталог</a>
                </div>
            `;
            document.getElementById('clearCart').style.display = 'none';
        }

        // Функция для отображения корзины
        function renderCart(cart) {
            const cartContent = document.getElementById('cartContent');
            
            if (!cart.items || cart.items.length === 0) {
                showEmptyCart('Ваша корзина пуста');
                return;
            }

            let total = 0;
            const itemsHtml = cart.items.map(item => {
                const product = item.productId;
                const itemTotal = product.price.self.UAH.currentPrice * item.quantity;
                total += itemTotal;

                return `
                    <div class="cart-item" data-product-id="${product._id}" data-size="${item.selectedSize}">
                        <img src="${product.imageData.imgMain}" alt="${product.info.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h3>${product.info.name}</h3>
                            <p class="cart-item-size">Размер: ${item.selectedSize}</p>
                        </div>
                        <div class="cart-item-price">
                            ${product.price.self.UAH.currentPrice} ₴
                        </div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="updateQuantity('${product._id}', '${item.selectedSize}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity('${product._id}', '${item.selectedSize}', ${item.quantity + 1})">+</button>
                        </div>
                        <button class="cart-item-remove" onclick="removeFromCart('${product._id}', '${item.selectedSize}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');

            cartContent.innerHTML = `
                <div class="cart-items">
                    ${itemsHtml}
                </div>
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>Итого:</span>
                        <span class="summary-total">${total} ₴</span>
                    </div>
                    <button class="checkout-btn" onclick="checkout()">
                        Оформить заказ
                    </button>
                </div>
            `;

            document.getElementById('clearCart').style.display = 'block';
        }

        // Функция для обновления количества товара
        async function updateQuantity(productId, size, newQuantity) {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }

                if (newQuantity < 1) {
                    await removeFromCart(productId, size);
                    return;
                }

                const response = await fetch('/api/cart', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productId,
                        quantity: newQuantity,
                        selectedSize: size
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Ошибка при обновлении количества');
                }

                const cart = await response.json();
                renderCart(cart);
                updateCartBadge(cart.items ? cart.items.length : 0);
            } catch (error) {
                console.error('Error in updateQuantity:', error);
                showNotification(error.message || 'Ошибка при обновлении количества товара', 'error');
            }
        }

        // Функция для удаления товара
        async function removeFromCart(productId, size) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/cart/item', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productId,
                        selectedSize: size
                    })
                });

                if (!response.ok) {
                    throw new Error('Ошибка при удалении товара');
                }

                const cart = await response.json();
                renderCart(cart);
                updateCartBadge(cart.items ? cart.items.length : 0);
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при удалении товара');
            }
        }

        // Функция для очистки корзины
        async function clearCart() {
            if (!confirm('Вы уверены, что хотите очистить корзину?')) return;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/cart', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Ошибка при очистке корзины');
                }

                showEmptyCart('Ваша корзина пуста');
                updateCartBadge(0);
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка при очистке корзины');
            }
        }

        // Функция для оформления заказа
        function checkout() {
            // Здесь будет логика оформления заказа
            alert('Функция оформления заказа будет доступна в ближайшее время');
        }

        // Загружаем корзину при загрузке страницы
        document.addEventListener('DOMContentLoaded', () => {
            loadCart();
            document.getElementById('clearCart').addEventListener('click', clearCart);
        });
