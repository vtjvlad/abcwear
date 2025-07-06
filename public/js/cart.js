// Функция для добавления товара в корзину
async function addToCart(productId, quantity, selectedSize) {
    console.log('Adding to cart:', { productId, quantity, selectedSize });
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to auth page');
            window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        console.log('Sending request to /api/cart');
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                quantity,
                selectedSize
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error:', errorData);
            throw new Error(errorData.message || 'Ошибка при добавлении товара в корзину');
        }

        const cart = await response.json();
        console.log('Cart updated:', cart);
        
        // Показываем уведомление об успешном добавлении
        showNotification('Товар добавлен в корзину', 'success');
        
        // Обновляем счетчик товаров в корзине в хедере
        updateCartCounter(cart.items.length);
        
        return cart;
    } catch (error) {
        console.error('Error in addToCart:', error);
        showNotification(error.message || 'Ошибка при добавлении товара в корзину', 'error');
        throw error;
    }
}

// Функция для удаления товара из корзины
async function removeFromCart(productId, selectedSize) {
    console.log('Removing from cart:', { productId, selectedSize });
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to auth page');
            window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        console.log('Sending request to /api/cart/item');
        const response = await fetch('/api/cart/item', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId,
                selectedSize
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server error:', errorData);
            throw new Error(errorData.message || 'Ошибка при удалении товара из корзины');
        }

        const cart = await response.json();
        console.log('Cart updated:', cart);
        
        // Показываем уведомление об успешном удалении
        showNotification('Товар удален из корзины', 'success');
        
        // Обновляем счетчик товаров в корзине в хедере
        updateCartCounter(cart.items.length);
        
        return cart;
    } catch (error) {
        console.error('Error in removeFromCart:', error);
        showNotification(error.message || 'Ошибка при удалении товара из корзины', 'error');
        throw error;
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    // Проверяем, существует ли уже контейнер для уведомлений
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Добавляем уведомление в контейнер
    notificationContainer.appendChild(notification);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Функция для обновления счетчика товаров в корзине
function updateCartCounter(count) {
    const cartCounter = document.querySelector('.cart-counter');
    if (cartCounter) {
        cartCounter.textContent = count;
        cartCounter.style.display = count > 0 ? 'block' : 'none';
    }
}

// Добавляем стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    }

    .notification {
        background: white;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        animation: slideIn 0.3s ease-out;
    }

    .notification.success {
        border-left: 4px solid #28a745;
    }

    .notification.error {
        border-left: 4px solid #dc3545;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .notification i {
        font-size: 20px;
    }

    .notification.success i {
        color: #28a745;
    }

    .notification.error i {
        color: #dc3545;
    }

    .notification.fade-out {
        animation: fadeOut 0.3s ease-out forwards;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes fadeOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Функция для отображения пустой корзины
function showEmptyCart(message) {
    const cartContent = document.getElementById('cartContent');
    if (!cartContent) return; // Если мы не на странице корзины, выходим

    cartContent.innerHTML = `
        <div class="cart-empty">
            <i class="fas fa-shopping-cart"></i>
            <h2>${message}</h2>
            <p>Перейдите в каталог, чтобы добавить товары в корзину</p>
            <a href="/catalog" class="btn btn-primary">Перейти в каталог</a>
        </div>
    `;
    const clearCartBtn = document.getElementById('clearCart');
    if (clearCartBtn) {
        clearCartBtn.style.display = 'none';
    }
}

// Функция для отображения корзины
function renderCart(cart) {
    const cartContent = document.getElementById('cartContent');
    if (!cartContent) return; // Если мы не на странице корзины, выходим
    
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

    const clearCartBtn = document.getElementById('clearCart');
    if (clearCartBtn) {
        clearCartBtn.style.display = 'block';
    }
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
    // Проверяем, находимся ли мы на странице корзины
    const cartContent = document.getElementById('cartContent');
    if (cartContent) {
        loadCart();
        const clearCartBtn = document.getElementById('clearCart');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', clearCart);
        }
    }
}); 