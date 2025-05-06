document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth';
        return;
    }

    // Load initial data
    loadProfile();
    loadOrders();
    loadFavorites();

    // Setup form handlers
    setupProfileForm();
    setupPasswordForm();
    setupAvatarUpload();
    setupMobileMenu();
});

// Load profile data
async function loadProfile() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            // Update displayed name
            document.getElementById('user-name').textContent = data.user.name || data.user.username;
            
            // Update form fields
            document.getElementById('username').value = data.user.username;
            document.getElementById('email').value = data.user.email;
            
            // Update avatar if exists
            if (data.user.avatar) {
                document.getElementById('user-avatar').src = data.user.avatar;
            }
        } else {
            throw new Error(data.error || 'Ошибка загрузки профиля');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast(error.message, 'error');
        if (error.message === 'Unauthorized' || error.message.includes('401')) {
            localStorage.removeItem('token');
            window.location.href = '/auth';
        }
    }
}

// Setup profile form
function setupProfileForm() {
    const form = document.getElementById('profile-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;

        try {
            const response = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username, email })
            });

            const data = await response.json();
            if (response.ok) {
                showToast('Профиль успешно обновлен');
                loadProfile(); // Reload profile data
            } else {
                throw new Error(data.error || 'Ошибка обновления профиля');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Setup password form
function setupPasswordForm() {
    const form = document.getElementById('password-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showToast('Пароли не совпадают', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();
            if (response.ok) {
                showToast('Пароль успешно изменен');
                form.reset();
            } else {
                throw new Error(data.error || 'Ошибка изменения пароля');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Setup avatar upload
function setupAvatarUpload() {
    const avatarUpload = document.getElementById('avatar-upload');
    
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/auth/upload-avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                document.getElementById('user-avatar').src = data.avatarUrl;
                showToast('Аватар успешно обновлен');
            } else {
                throw new Error(data.error || 'Ошибка загрузки аватара');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Load orders
async function loadOrders() {
    try {
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const orders = await response.json();
        
        const ordersList = document.getElementById('orders-list');
        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="text-center text-muted">У вас пока нет заказов</div>';
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Заказ #${order._id}</h5>
                    <span class="order-status status-${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </div>
                <p class="text-muted mb-2">Дата: ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p class="mb-2">Сумма: ${order.total} грн</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${order.items.length} товаров</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="toggleOrderDetails('${order._id}')">
                        Подробнее
                    </button>
                </div>
                <div class="order-details" id="order-${order._id}">
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <img src="${item.image}" alt="${item.name}">
                                <h6>${item.name}</h6>
                                <p class="text-muted">Размер: ${item.size}</p>
                                <p class="mb-0">${item.price} грн</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Ошибка загрузки заказов', 'error');
    }
}

// Load favorites
async function loadFavorites() {
    try {
        const response = await fetch('/api/favorites', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const favorites = await response.json();
        
        const favoritesList = document.getElementById('favorites-list');
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<div class="text-center text-muted">У вас пока нет избранных товаров</div>';
            return;
        }

        favoritesList.innerHTML = favorites.map(item => `
            <div class="col-md-4">
                <div class="favorite-item">
                    <img src="${item.image}" alt="${item.name}">
                    <h5>${item.name}</h5>
                    <p class="text-muted">${item.price} грн</p>
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-sm btn-primary">В корзину</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeFavorite('${item._id}')">
                            <i class="bi bi-heart-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading favorites:', error);
        showToast('Ошибка загрузки избранного', 'error');
    }
}

// Setup mobile menu
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const profileSidebar = document.querySelector('.profile-sidebar');

    mobileMenuToggle.addEventListener('click', () => {
        profileSidebar.classList.toggle('show');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileSidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            profileSidebar.classList.remove('show');
        }
    });
}

// Helper function to show toasts
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast show`;
    toast.innerHTML = `
        <div class="toast-body ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white">
            ${message}
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Toggle order details
function toggleOrderDetails(orderId) {
    const detailsElement = document.getElementById(`order-${orderId}`);
    detailsElement.style.display = detailsElement.style.display === 'none' ? 'block' : 'none';
}

// Remove from favorites
async function removeFavorite(itemId) {
    try {
        const response = await fetch(`/api/favorites/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            showToast('Товар удален из избранного');
            loadFavorites();
        } else {
            throw new Error('Ошибка при удалении из избранного');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
} 
} 