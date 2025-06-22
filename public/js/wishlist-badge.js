// Функция для обновления индикатора избранного
function updateWishlistBadge(count) {
    const badges = document.querySelectorAll('.wishlist-badge');
    badges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    });
}

// Функция для загрузки количества товаров в избранном
async function loadWishlistCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            updateWishlistBadge(0);
            return;
        }

        const response = await fetch('/api/wishlist', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке избранного');
        }

        const wishlist = await response.json();
        updateWishlistBadge(wishlist.items ? wishlist.items.length : 0);
    } catch (error) {
        console.error('Ошибка при загрузке количества избранных товаров:', error);
        updateWishlistBadge(0);
    }
}

// Загружаем количество товаров при загрузке страницы
document.addEventListener('DOMContentLoaded', loadWishlistCount);

// Экспортируем функции для использования в других скриптах
window.updateWishlistBadge = updateWishlistBadge;
window.loadWishlistCount = loadWishlistCount; 