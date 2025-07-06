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

// Функция для загрузки количества товаров в корзине
async function loadCartCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
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
        updateCartBadge(cart.items ? cart.items.length : 0);
    } catch (error) {
        console.error('Ошибка при загрузке количества товаров:', error);
        updateCartBadge(0);
    }
}

// Загружаем количество товаров при загрузке страницы
document.addEventListener('DOMContentLoaded', loadCartCount);

// Экспортируем функции для использования в других скриптах
window.updateCartBadge = updateCartBadge;
window.loadCartCount = loadCartCount; 