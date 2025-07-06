document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
});

async function loadWishlist() {
    const token = localStorage.getItem('token');
    if (!token) {
        showEmptyWishlist('Войдите, чтобы увидеть избранное');
        return;
    }

    try {
        const response = await fetch('/api/wishlist', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить список избранного');
        }

        const wishlist = await response.json();
        renderWishlist(wishlist);
    } catch (error) {
        console.error(error);
        showEmptyWishlist('Ошибка при загрузке избранного');
    }
}

function renderWishlist(wishlist) {
    const wishlistContent = document.getElementById('wishlistContent');
    if (!wishlistContent) return;

    if (!wishlist.items || wishlist.items.length === 0) {
        showEmptyWishlist('В избранном пока ничего нет');
        return;
    }

    wishlistContent.innerHTML = wishlist.items.map(product => {
        const price = product.price && product.price.self && product.price.self.UAH ?
            `${product.price.self.UAH.currentPrice} грн` : 'Цена не указана';
            
        const imageUrl = product.imageData && product.imageData.imgMain ? 
            product.imageData.imgMain.replace(/\\\//g, '/') : '/placeholder.jpg';

        return `
            <div class="product-card" data-product-id="${product._id}">
                <a href="/product/${product._id}">
                    <img src="${imageUrl}" alt="${product.info.name}">
                </a>
                <div class="product-card-body">
                    <h5 class="product-card-title">${product.info.name}</h5>
                    <p class="product-card-price">${price}</p>
                    <button class="remove-from-wishlist-btn" onclick="removeFromWishlist('${product._id}')">
                        <i class="fas fa-trash-alt"></i> Удалить
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showEmptyWishlist(message) {
    const wishlistContent = document.getElementById('wishlistContent');
    if (!wishlistContent) return;

    wishlistContent.innerHTML = `
        <div class="wishlist-empty" style="text-align: center; grid-column: 1 / -1; padding: 3rem 1rem;">
            <i class="fas fa-heart" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
            <h2>${message}</h2>
            <p>Добавляйте товары в избранное, чтобы не потерять их</p>
            <a href="/catalog" class="btn btn-primary" style="margin-top: 1rem;">Перейти в каталог</a>
        </div>
    `;
}

async function removeFromWishlist(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Пожалуйста, войдите в систему', 'error');
        return;
    }

    try {
        const response = await fetch('/api/wishlist', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Не удалось удалить из избранного');
        }

        showNotification('Товар удален из избранного', 'success');
        // Перезагружаем список, чтобы убрать удаленный товар
        loadWishlist(); 
    } catch (error) {
        console.error('Ошибка при удалении из избранного:', error);
        showNotification(error.message, 'error');
    }
}

async function addToWishlist(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }

    try {
        const response = await fetch('/api/wishlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Не удалось добавить в избранное');
        }

        showNotification('Товар добавлен в избранное', 'success');
        updateWishlistIcon(productId, true);

    } catch (error) {
        console.error('Ошибка при добавлении в избранное:', error);
        showNotification(error.message, 'error');
    }
}

function updateWishlistIcon(productId, isWishlisted) {
    const icon = document.querySelector(`.wishlist-icon[data-product-id="${productId}"]`);
    if (icon) {
        if (isWishlisted) {
            icon.classList.add('active');
            icon.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            icon.classList.remove('active');
            icon.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
}


function showNotification(message, type = 'success') {
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);

        const style = document.createElement('style');
        style.textContent = `
        .notification-container { position: fixed; top: 20px; right: 20px; z-index: 1050; }
        .notification { background: #fff; padding: 15px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 10px; opacity: 0; transition: all 0.3s ease; transform: translateX(100%); border-left: 5px solid #28a745; }
        .notification.error { border-left-color: #dc3545; }
        .notification.show { opacity: 1; transform: translateX(0); }
        `;
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            container.removeChild(notification);
        }, 300);
    }, 3000);
} 