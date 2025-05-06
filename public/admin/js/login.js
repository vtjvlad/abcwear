// Простий логін (для прикладу, без бекенду)
const loginContainer = document.getElementById('admin-login');
const adminPanel = document.getElementById('admin-panel');

function showLoginForm() {
    loginContainer.innerHTML = `
        <form id="admin-login-form" class="admin-login-form">
            <h2>Вхід в адмін-панель</h2>
            <input type="text" id="admin-username" placeholder="Логін" required>
            <input type="password" id="admin-password" placeholder="Пароль" required>
            <button type="submit">Увійти</button>
            <div id="admin-login-error" class="admin-login-error"></div>
        </form>
    `;
    adminPanel.style.display = 'none';
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    // Простий приклад: логін admin, пароль admin123
    if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('adminToken', 'demo-token');
        loginContainer.innerHTML = '';
        adminPanel.style.display = '';
    } else {
        document.getElementById('admin-login-error').textContent = 'Невірний логін або пароль';
    }
}

function checkAuth() {
    if (localStorage.getItem('adminToken')) {
        loginContainer.innerHTML = '';
        adminPanel.style.display = '';
    } else {
        showLoginForm();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loginContainer.addEventListener('submit', function(e) {
        if (e.target && e.target.id === 'admin-login-form') handleLogin(e);
    });
}); 