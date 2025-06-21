// Page loader
document.addEventListener('DOMContentLoaded', function() {
    // Hide loader when page is fully loaded
    window.addEventListener('load', function() {
        const loader = document.querySelector('.page-loader');
        if (loader) {
            loader.classList.add('fade-out');
            // Remove loader from DOM after animation
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
    });
});

// Открытие/закрытие мобильного меню
function openMobileMenu() {
    document.getElementById('mobile-offcanvas').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
    document.getElementById('mobile-offcanvas').classList.remove('open');
    document.body.style.overflow = '';
}
// Список шутливых и мотивирующих подсказок для поиска
const searchPlaceholders = [
    'Поиск: "Кроссовки мечты"',
    'Попробуйте: "Сумка для счастья"',
    'Что купить? Например, "Пижама для выходных"',
    'Введи: "Подарок себе любимому"',
    '1137',
    'А может, "Шапка для отпуска"?',
    'Пора встать с кровати!!!',
    'Порадуй себя — ищи "Новую футболку"',
    'Проснись!',
    'Почувствуй стиль: "Очки как у звезды"',
    'Поторопись! "Скидки на носки"',
    'Поищи: "Платье для настроения"',
    'Введи: "Купить всё!" (шутка, но вдруг?)',
    'Пока не нашел? Попробуй "Кроссовки для бега"'
];
let searchIndex = 0;
let desktopTypingInterval = null;
let mobileTypingInterval = null;
function typePlaceholder(text, input, intervalRef, cb) {
    let i = 0;
    input.setAttribute('placeholder', '');
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
        input.setAttribute('placeholder', text.slice(0, i + 1));
        i++;
        if (i === text.length) {
            clearInterval(intervalRef.current);
            if (cb) cb();
        }
    }, 45);
}
function rotateSearchPlaceholder() {
    const desktopInput = document.getElementById('desktop-search-input');
    const mobileInput = document.getElementById('mobile-search-input');
    if (desktopInput) typePlaceholder(searchPlaceholders[searchIndex], desktopInput, {current: desktopTypingInterval}, () => {});
    if (mobileInput) typePlaceholder(searchPlaceholders[searchIndex], mobileInput, {current: mobileTypingInterval}, () => {});
    searchIndex = (searchIndex + 1) % searchPlaceholders.length;
}
window.addEventListener('DOMContentLoaded', () => {
    rotateSearchPlaceholder();
    setInterval(rotateSearchPlaceholder, 3500);
});

// Инициализация SEO-фильтров
document.addEventListener('DOMContentLoaded', async function() {
    // Получаем текущие параметры фильтров из URL
    const urlParams = new URLSearchParams(window.location.search);
    const filters = {
        color: urlParams.get('color'),
        category: urlParams.get('category'),
        minPrice: urlParams.get('minPrice'),
        maxPrice: urlParams.get('maxPrice'),
        search: urlParams.get('search')
    };

    // Обновляем SEO метаданные
    // await seoFilters.getFiltersMetadata(filters);

    // Обработчик изменения фильтров
    const filterInputs = document.querySelectorAll('#color-filter, #category-filter, #name-filter, #min-price, #max-price, #search');
    filterInputs.forEach(input => {
        input.addEventListener('change', async function() {
            const currentFilters = {
                color: document.getElementById('color-filter').value,
                category: document.getElementById('category-filter').value,
                minPrice: document.getElementById('min-price').value,
                maxPrice: document.getElementById('max-price').value,
                search: document.getElementById('search').value
            };

            // Обновляем URL с новыми параметрами
            const newUrl = new URL(window.location.href);
            Object.entries(currentFilters).forEach(([key, value]) => {
                if (value) {
                    newUrl.searchParams.set(key, value);
                } else {
                    newUrl.searchParams.delete(key);
                }
            });
            window.history.pushState({}, '', newUrl);

            // Обновляем SEO метаданные
            await seoFilters.getFiltersMetadata(currentFilters);
        });
    });

    // Обработчик кнопки "Применить фильтры"
    document.getElementById('apply-filters').addEventListener('click', async function() {
        const currentFilters = {
            color: document.getElementById('color-filter').value,
            category: document.getElementById('category-filter').value,
            minPrice: document.getElementById('min-price').value,
            maxPrice: document.getElementById('max-price').value,
            search: document.getElementById('search').value
        };

        // Обновляем URL с новыми параметрами
        const newUrl = new URL(window.location.href);
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value) {
                newUrl.searchParams.set(key, value);
            } else {
                newUrl.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', newUrl);

        // Обновляем SEO метаданные
        await seoFilters.getFiltersMetadata(currentFilters);
    });

    // Обработчик кнопки "Очистить все"
    document.getElementById('clear-filters').addEventListener('click', async function() {
        // Очищаем URL
        window.history.pushState({}, '', '/w');
        
        // Обновляем SEO метаданные с пустыми фильтрами
        await seoFilters.getFiltersMetadata({});
    });
});