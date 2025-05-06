document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (!authUtils.isAuthenticated()) {
        window.location.href = '/auth';
        return;
    }

    // Load user data
    loadUserData();

    // Setup form handlers
    setupProfileForm();
    setupPasswordForm();
    loadOrders();

    // Setup section switching
    setupSectionSwitching();
});

// Load user data
async function loadUserData() {
    try {
        const response = await authUtils.fetchWithAuth('/api/auth/me');
        const data = await response.json();
        
        // Fill form fields
        document.getElementById('name').value = data.user.name;
        document.getElementById('email').value = data.user.email;
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup profile form
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const successMessage = document.getElementById('profileSuccess');
    const errorMessage = document.getElementById('profileError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        try {
            const response = await authUtils.fetchWithAuth('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            });

            const data = await response.json();
            
            // Update local storage
            authUtils.updateUserInfo({ name, email });

            // Show success message
            successMessage.textContent = 'Профиль успешно обновлен';
            successMessage.classList.remove('hidden');
            errorMessage.classList.add('hidden');

            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 3000);
        } catch (error) {
            errorMessage.textContent = error.message || 'Ошибка при обновлении профиля';
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
        }
    });
}

// Setup password form
function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    const successMessage = document.getElementById('passwordSuccess');
    const errorMessage = document.getElementById('passwordError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            errorMessage.textContent = 'Пароли не совпадают';
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
            return;
        }

        try {
            const response = await authUtils.fetchWithAuth('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();
            
            // Clear form
            form.reset();

            // Show success message
            successMessage.textContent = 'Пароль успешно изменен';
            successMessage.classList.remove('hidden');
            errorMessage.classList.add('hidden');

            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 3000);
        } catch (error) {
            errorMessage.textContent = error.message || 'Ошибка при изменении пароля';
            errorMessage.classList.remove('hidden');
            successMessage.classList.add('hidden');
        }
    });
}

// Load orders
async function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    
    try {
        const response = await authUtils.fetchWithAuth('/api/orders');
        const orders = await response.json();

        if (orders.length === 0) {
            ordersList.innerHTML = '<div class="text-gray-500 text-center py-4">У вас пока нет заказов</div>';
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="border rounded-lg p-4">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold">Заказ #${order._id}</h3>
                        <p class="text-sm text-gray-500">${new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${order.status === 'completed' ? 'Выполнен' :
                          order.status === 'processing' ? 'В обработке' :
                          'Новый'}
                    </span>
                </div>
                <div class="space-y-2">
                    ${order.items.map(item => `
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-medium">${item.name}</p>
                                <p class="text-sm text-gray-500">Размер: ${item.size}</p>
                            </div>
                            <p class="font-medium">${item.price} ₴</p>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 pt-4 border-t flex justify-between items-center">
                    <p class="text-sm text-gray-500">${order.items.length} товаров</p>
                    <p class="font-bold">Итого: ${order.total} ₴</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        ordersList.innerHTML = '<div class="text-red-500 text-center py-4">Ошибка при загрузке заказов</div>';
    }
}

// Setup section switching
function setupSectionSwitching() {
    const sections = {
        profile: document.getElementById('profileSection'),
        orders: document.getElementById('ordersSection')
    };

    const buttons = {
        profile: document.querySelector('button[onclick="showSection(\'profile\')"]'),
        orders: document.querySelector('button[onclick="showSection(\'orders\')"]')
    };

    window.showSection = (sectionName) => {
        // Hide all sections
        Object.values(sections).forEach(section => section.classList.add('hidden'));
        
        // Show selected section
        sections[sectionName].classList.remove('hidden');

        // Update button styles
        Object.values(buttons).forEach(button => {
            button.classList.remove('text-blue-600', 'font-medium');
            button.classList.add('text-gray-600');
        });
        buttons[sectionName].classList.add('text-blue-600', 'font-medium');
        buttons[sectionName].classList.remove('text-gray-600');
    };
} 