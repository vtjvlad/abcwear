// SPA-навігація для адмінки
const adminContent = document.getElementById('admin-content');
const adminMenu = document.querySelector('.admin-menu');
const logoutBtn = document.getElementById('admin-logout');

const modules = {
    dashboard: 'dashboard.js',
    products: 'products.js',
    categories: 'categories.js',
    orders: 'orders.js',
    users: 'users.js',
    content: 'content.js',
    settings: 'settings.js'
};

function loadModule(module) {
    adminContent.innerHTML = '<div class="admin-loading">Завантаження...</div>';
    if (modules[module]) {
        import(`./${modules[module]}`)
            .then(mod => {
                if (mod && typeof mod.render === 'function') {
                    adminContent.innerHTML = '';
                    mod.render(adminContent);
                } else {
                    adminContent.innerHTML = '<div class="admin-error">Модуль не знайдено</div>';
                }
            })
            .catch(() => {
                adminContent.innerHTML = '<div class="admin-error">Помилка завантаження модуля</div>';
            });
    } else {
        adminContent.innerHTML = '<div class="admin-error">Модуль не знайдено</div>';
    }
}

if (adminMenu) {
    adminMenu.addEventListener('click', e => {
        if (e.target.dataset.module) {
            loadModule(e.target.dataset.module);
        }
        if (e.target.id === 'admin-logout') {
            localStorage.removeItem('adminToken');
            location.reload();
        }
    });
}

// За замовчуванням відкриваємо дашборд
if (localStorage.getItem('adminToken')) {
    loadModule('dashboard');
} 