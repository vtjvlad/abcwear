export function render(container) {
    container.innerHTML = `
        <h2>Категорії</h2>
        <form id="add-category-form" class="admin-form">
            <input type="text" id="category-name" placeholder="Назва категорії" required>
            <input type="text" id="category-description" placeholder="Опис (необов'язково)">
            <input type="text" id="category-subcategories" placeholder="Підкатегорії (через кому)">
            <button type="submit">Додати категорію</button>
        </form>
        <div id="categories-list" class="admin-list"></div>
    `;
    loadCategories();

    // Додавання категорії
    container.querySelector('#add-category-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = container.querySelector('#category-name').value.trim();
        const description = container.querySelector('#category-description').value.trim();
        const subcategories = container.querySelector('#category-subcategories').value.split(',').map(s => s.trim()).filter(Boolean);
        if (!name) return;
        await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, subcategories })
        });
        loadCategories();
        e.target.reset();
    };

    // Завантаження списку категорій
    async function loadCategories() {
        const list = container.querySelector('#categories-list');
        list.innerHTML = 'Завантаження...';
        const res = await fetch('/api/categories');
        const categories = await res.json();
        if (!categories.length) {
            list.innerHTML = '<div>Категорій ще немає</div>';
            return;
        }
        list.innerHTML = `<ul>${categories.map(cat => `
            <li>
                <b>${cat.name}</b> <span style="color:#888;">${cat.description || ''}</span><br>
                <span style="font-size:13px;color:#555;">Підкатегорії: ${cat.subcategories && cat.subcategories.length ? cat.subcategories.join(', ') : '—'}</span><br>
                <button data-id="${cat._id}" class="edit-btn">✏️</button>
                <button data-id="${cat._id}" class="delete-btn">🗑️</button>
            </li>
        `).join('')}</ul>`;
        // Видалення
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Видалити категорію?')) {
                    await fetch(`/api/categories/${btn.dataset.id}`, { method: 'DELETE' });
                    loadCategories();
                }
            };
        });
        // Редагування (inline)
        list.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => startEdit(btn.dataset.id);
        });
    }

    // Inline-редагування
    async function startEdit(id) {
        const res = await fetch(`/api/categories`);
        const categories = await res.json();
        const cat = categories.find(c => c._id === id);
        if (!cat) return;
        const list = container.querySelector('#categories-list');
        list.innerHTML = `
            <form id="edit-category-form" class="admin-form">
                <input type="text" id="edit-category-name" value="${cat.name}" required>
                <input type="text" id="edit-category-description" value="${cat.description || ''}">
                <input type="text" id="edit-category-subcategories" value="${cat.subcategories ? cat.subcategories.join(', ') : ''}" placeholder="Підкатегорії (через кому)">
                <button type="submit">Зберегти</button>
                <button type="button" id="cancel-edit">Скасувати</button>
            </form>
        `;
        list.querySelector('#edit-category-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = list.querySelector('#edit-category-name').value.trim();
            const description = list.querySelector('#edit-category-description').value.trim();
            const subcategories = list.querySelector('#edit-category-subcategories').value.split(',').map(s => s.trim()).filter(Boolean);
            await fetch(`/api/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, subcategories })
            });
            loadCategories();
        };
        list.querySelector('#cancel-edit').onclick = loadCategories;
    }
} 