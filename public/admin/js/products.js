export function render(container) {
    container.innerHTML = `
        <h2>Товари</h2>
        <form id="add-product-form" class="admin-form" enctype="multipart/form-data">
            <input type="text" id="product-name" placeholder="Назва товару" required>
            <input type="text" id="product-description" placeholder="Опис">
            <input type="number" id="product-price" placeholder="Ціна" required min="0">
            <select id="product-category" required><option value="">Оберіть категорію</option></select>
            <select id="product-subcategory"><option value="">Оберіть підкатегорію</option></select>
            <input type="file" id="product-image" accept="image/*">
            <button type="submit">Додати товар</button>
        </form>
        <div id="products-list" class="admin-list"></div>
    `;
    let categories = [];
    let subcategories = [];
    loadCategories();
    loadProducts();

    // Додавання товару
    container.querySelector('#add-product-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = container.querySelector('#product-name').value.trim();
        const description = container.querySelector('#product-description').value.trim();
        const price = parseFloat(container.querySelector('#product-price').value);
        const category = container.querySelector('#product-category').value;
        const subcategory = container.querySelector('#product-subcategory').value;
        let imgMain = '';
        const fileInput = container.querySelector('#product-image');
        if (fileInput.files && fileInput.files[0]) {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            imgMain = uploadData.url;
        }
        if (!name || !category || isNaN(price)) return;
        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                info: { name, discription: description },
                price: { self: { UAH: { currentPrice: price } } },
                data: { productType: category, productSubType: subcategory },
                imageData: { imgMain }
            })
        });
        loadProducts();
        e.target.reset();
    };

    // Категорії та підкатегорії
    async function loadCategories() {
        const res = await fetch('/api/categories');
        categories = await res.json();
        const catSelect = container.querySelector('#product-category');
        catSelect.innerHTML = '<option value="">Оберіть категорію</option>' +
            categories.map(cat => `<option value="${cat.description}">${cat.name}</option>`).join('');
        catSelect.onchange = function() {
            const selected = categories.find(c => c.description === this.value);
            subcategories = selected ? selected.subcategories : [];
            const subcatSelect = container.querySelector('#product-subcategory');
            subcatSelect.innerHTML = '<option value="">Оберіть підкатегорію</option>' +
                subcategories.map(sub => `<option value="${sub}">${sub}</option>`).join('');
        };
    }

    // Список товарів
    async function loadProducts() {
        const list = container.querySelector('#products-list');
        list.innerHTML = 'Завантаження...';
        const res = await fetch('/api/products');
        const data = await res.json();
        const products = Array.isArray(data.products) ? data.products.flat() : [];
        if (!products.length) {
            list.innerHTML = '<div>Товарів ще немає</div>';
            return;
        }
        list.innerHTML = `<ul>${products.map(prod => `
            <li>
                ${prod.imageData?.imgMain ? `<img src="${prod.imageData.imgMain}" alt="img" style="max-width:60px;max-height:60px;vertical-align:middle;margin-right:8px;">` : ''}
                <b>${prod.info?.name || ''}</b> — <span style=\"color:#888;\">${prod.data?.productType || ''}${prod.data?.productSubType ? ' / ' + prod.data.productSubType : ''}</span> — <span>${prod.price?.self?.UAH?.currentPrice || ''} грн</span>
                <button data-id=\"${prod._id}\" class=\"edit-btn\">✏️</button>
                <button data-id=\"${prod._id}\" class=\"delete-btn\">🗑️</button>
            </li>
        `).join('')}</ul>`;
        // Видалення
        list.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Видалити товар?')) {
                    await fetch(`/api/products/${btn.dataset.id}`, { method: 'DELETE' });
                    loadProducts();
                }
            };
        });
        // Редагування
        list.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => startEdit(btn.dataset.id);
        });
    }

    // Inline-редагування товару
    async function startEdit(id) {
        const res = await fetch('/api/products');
        const data = await res.json();
        const products = Array.isArray(data.products) ? data.products.flat() : [];
        const prod = products.find(p => p._id === id);
        if (!prod) return;
        const list = container.querySelector('#products-list');
        // Категорії для select
        const catOptions = categories.map(cat => `<option value=\"${cat.description}\"${prod.data?.productType===cat.description?' selected':''}>${cat.name}</option>`).join('');
        // Підкатегорії для select
        const selectedCat = categories.find(c => c.description === prod.data?.productType);
        const subcatList = selectedCat ? selectedCat.subcategories : [];
        const subcatOptions = ['<option value="">Оберіть підкатегорію</option>']
            .concat(subcatList.map(sub => `<option value=\"${sub}\"${prod.data?.productSubType===sub?' selected':''}>${sub}</option>`)).join('');
        list.innerHTML = `
            <form id=\"edit-product-form\" class=\"admin-form\" enctype=\"multipart/form-data\">
                ${prod.imageData?.imgMain ? `<img src=\"${prod.imageData.imgMain}\" alt=\"img\" style=\"max-width:60px;max-height:60px;vertical-align:middle;margin-bottom:8px;\">` : ''}
                <input type=\"file\" id=\"edit-product-image\" accept=\"image/*\">
                <input type=\"text\" id=\"edit-product-name\" value=\"${prod.info?.name||''}\" required>
                <input type=\"text\" id=\"edit-product-description\" value=\"${prod.info?.discription||''}\">
                <input type=\"number\" id=\"edit-product-price\" value=\"${prod.price?.self?.UAH?.currentPrice||''}\" required min=\"0\">
                <select id=\"edit-product-category\" required>${catOptions}</select>
                <select id=\"edit-product-subcategory\">${subcatOptions}</select>
                <button type=\"submit\">Зберегти</button>
                <button type=\"button\" id=\"cancel-edit\">Скасувати</button>
            </form>
        `;
        // Динамічне оновлення підкатегорій при зміні категорії
        const catSelect = list.querySelector('#edit-product-category');
        catSelect.onchange = function() {
            const selected = categories.find(c => c.description === this.value);
            const subcatList = selected ? selected.subcategories : [];
            const subcatSelect = list.querySelector('#edit-product-subcategory');
            subcatSelect.innerHTML = '<option value="">Оберіть підкатегорію</option>' +
                subcatList.map(sub => `<option value="${sub}">${sub}</option>`).join('');
        };
        // Збереження змін
        list.querySelector('#edit-product-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = list.querySelector('#edit-product-name').value.trim();
            const description = list.querySelector('#edit-product-description').value.trim();
            const price = parseFloat(list.querySelector('#edit-product-price').value);
            const category = list.querySelector('#edit-product-category').value;
            const subcategory = list.querySelector('#edit-product-subcategory').value;
            let imgMain = prod.imageData?.imgMain || '';
            const fileInput = list.querySelector('#edit-product-image');
            if (fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                imgMain = uploadData.url;
            }
            await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    info: { name, discription: description },
                    price: { self: { UAH: { currentPrice: price } } },
                    data: { productType: category, productSubType: subcategory },
                    imageData: { imgMain }
                })
            });
            loadProducts();
        };
        // Скасування
        list.querySelector('#cancel-edit').onclick = loadProducts;
    }
} 