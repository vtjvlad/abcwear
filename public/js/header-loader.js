// Кэш для хранения загруженного header
const headerCache = {
    html: null,
    styles: null,
    scripts: null,
    fonts: null,
    lastLoaded: null
};

// Функция для загрузки и вставки шапки
async function loadHeader() {
    try {
        // Проверяем кэш
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
        
        if (headerCache.html && 
            headerCache.lastLoaded && 
            (now - headerCache.lastLoaded) < CACHE_DURATION) {
            console.log('Using cached header');
            insertCachedHeader();
            return;
        }

        console.log('Loading fresh header');
        // Загружаем содержимое header.html
        const response = await fetch('/header.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const headerHtml = await response.text();

        // Создаем временный div для парсинга HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = headerHtml;

        // Извлекаем нужные элементы
        const header = tempDiv.querySelector('.main-header');
        const mobileBottomNav = tempDiv.querySelector('.mobile-bottom-nav');
        const mobileOffcanvas = tempDiv.querySelector('#mobile-offcanvas');
        const scripts = tempDiv.querySelectorAll('script');
        const styles = tempDiv.querySelectorAll('style');
        const fonts = tempDiv.querySelectorAll('link[rel="preconnect"], link[rel="stylesheet"]');

        // Сохраняем в кэш
        headerCache.html = {
            header: header.outerHTML,
            mobileBottomNav: mobileBottomNav.outerHTML,
            mobileOffcanvas: mobileOffcanvas.outerHTML
        };
        headerCache.styles = Array.from(styles).map(style => style.outerHTML);
        headerCache.scripts = Array.from(scripts).map(script => script.outerHTML);
        headerCache.fonts = Array.from(fonts).map(font => font.outerHTML);
        headerCache.lastLoaded = now;

        // Вставляем элементы
        insertCachedHeader();
    } catch (error) {
        console.error('Error loading header:', error);
    }
}

// Функция для вставки кэшированного header
function insertCachedHeader() {
    if (!headerCache.html) return;

    // Вставляем элементы в начало body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = headerCache.html.header;
    document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);

    tempDiv.innerHTML = headerCache.html.mobileBottomNav;
    document.body.appendChild(tempDiv.firstChild);

    tempDiv.innerHTML = headerCache.html.mobileOffcanvas;
    document.body.appendChild(tempDiv.firstChild);

    // Добавляем стили
    headerCache.styles.forEach(style => {
        const styleElement = document.createElement('style');
        styleElement.textContent = style;
        document.head.appendChild(styleElement);
    });

    // Добавляем шрифты
    headerCache.fonts.forEach(font => {
        const fontElement = document.createElement('link');
        fontElement.rel = font.includes('preconnect') ? 'preconnect' : 'stylesheet';
        fontElement.href = font.match(/href="([^"]+)"/)[1];
        if (font.includes('crossorigin')) {
            fontElement.crossOrigin = 'anonymous';
        }
        document.head.appendChild(fontElement);
    });

    // Инициализируем обработчики событий
    initializeHeaderEvents();
    loadCategoriesToMenu();
    loadSubcategories();
}

// Функция для инициализации обработчиков событий
function initializeHeaderEvents() {
    console.log('Initializing header events');

    // Обработка поиска
    const desktopSearchForm = document.querySelector('.header-search');
    const mobileSearchForm = document.querySelector('.mobile-header-search');
    
    if (desktopSearchForm) {
        console.log('Desktop search form found');
        desktopSearchForm.addEventListener('submit', (e) => handleSearch(e, false));
    }
    
    if (mobileSearchForm) {
        console.log('Mobile search form found');
        mobileSearchForm.addEventListener('submit', (e) => handleSearch(e, true));
    }

    // Переключение языка
    const langSwitches = document.querySelectorAll('.lang-switch');
    console.log('Language switches found:', langSwitches.length);
    langSwitches.forEach(switchEl => {
        switchEl.addEventListener('click', toggleLanguage);
    });

    // Навигационные ссылки
    const navLinks = document.querySelectorAll('.category, .menu-link, .offcanvas-nav a');
    console.log('Navigation links found:', navLinks.length);
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Иконки действий
    const iconButtons = document.querySelectorAll('.icon-btn, .bottom-nav-btn');
    console.log('Icon buttons found:', iconButtons.length);
    iconButtons.forEach(button => {
        button.addEventListener('click', handleIconClick);
    });

    // Активация текущей категории
    const currentPath = window.location.pathname;
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        const href = category.getAttribute('href');
        if (href && currentPath.includes(href)) {
            category.classList.add('active');
        }
    });

    // Инициализация анимации поисковых подсказок
    initializeSearchPlaceholders();
}

// Функции для обработки событий
function handleSearch(event, isMobile = false) {
    event.preventDefault();
    console.log('Search submitted', isMobile ? 'mobile' : 'desktop');
    const searchInput = isMobile ? 
        document.getElementById('mobile-search-input') : 
        document.getElementById('desktop-search-input');
    
    const query = searchInput.value.trim();
    console.log('Search query:', query);
    if (query) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
}

function toggleLanguage(event) {
    event.preventDefault();
    console.log('Language toggle clicked');
    const langElements = event.currentTarget.querySelectorAll('.lang');
    langElements.forEach(lang => lang.classList.toggle('active'));
}

function handleNavigation(event) {
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href');
    console.log('Navigation clicked:', href);
    if (href && href !== '#') {
        window.location.href = href;
    }
}

function handleIconClick(event) {
    event.preventDefault();
    const icon = event.currentTarget.querySelector('i');
    const iconClass = icon.className;
    console.log('Icon clicked:', iconClass);
    
    if (iconClass.includes('fa-circle-user')) {
        window.location.href = '/profile';
    } else if (iconClass.includes('fa-heart')) {
        window.location.href = '/favorites';
    } else if (iconClass.includes('fa-bag-shopping')) {
        window.location.href = '/cart';
    } else if (iconClass.includes('fa-grip-horizontal')) {
        window.location.href = '/w';
    }
}

function openMobileMenu() {
    console.log('Opening mobile menu');
    document.getElementById('mobile-offcanvas').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    console.log('Closing mobile menu');
    document.getElementById('mobile-offcanvas').classList.remove('open');
    document.body.style.overflow = '';
}

// Функция для анимации поисковых подсказок
function initializeSearchPlaceholders() {
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

    rotateSearchPlaceholder();
    setInterval(rotateSearchPlaceholder, 3500);
}

// Функция для загрузки и вставки категорий в меню
async function loadCategoriesToMenu() {
    try {
        const response = await fetch('/api/filters/categories');
        if (!response.ok) throw new Error('Ошибка загрузки категорий');
        const categories = await response.json();
        // Мапа для відображення назв (можна змінити під свої потреби)
        const categoryNames = {
            'APPAREL': 'Одяг',
            'EQUIPMENT': 'Аксесуари',
            'FOOTWEAR': 'Взуття',
            'STORED_VALUE': 'Подарункові карти'
        };
        // Десктоп
        const headerCategories = document.querySelector('.header-categories');
        if (headerCategories) {
            headerCategories.innerHTML = '';
            categories.forEach(cat => {
                const a = document.createElement('a');
                a.className = 'category';
                a.href = `/c/${cat.toLowerCase()}`;
                a.textContent = categoryNames[cat] || cat;
                headerCategories.appendChild(a);
            });
        }
        // Мобільне меню
        const mobileCategories = document.querySelector('.mobile-main-categories');
        if (mobileCategories) {
            mobileCategories.innerHTML = '';
            categories.forEach(cat => {
                const a = document.createElement('a');
                a.className = 'category';
                a.href = `/c/${cat.toLowerCase()}`;
                a.textContent = categoryNames[cat] || cat;
                mobileCategories.appendChild(a);
            });
        }
        // Оффканвас меню
        const offcanvasNav = document.querySelector('.offcanvas-nav');
        if (offcanvasNav) {
            // Зберігаємо старі пункти (бренди, розпродаж тощо)
            const staticLinks = Array.from(offcanvasNav.querySelectorAll('a.sale, a[href="#"], a[href="/b/nike/"]'));
            offcanvasNav.innerHTML = '';
            categories.forEach(cat => {
                const a = document.createElement('a');
                a.className = 'category';
                a.href = `/c/${cat.toLowerCase()}`;
                a.textContent = categoryNames[cat] || cat;
                offcanvasNav.appendChild(a);
            });
            staticLinks.forEach(link => offcanvasNav.appendChild(link));
        }
    } catch (e) {
        console.error('Не вдалося завантажити категорії:', e);
    }
}

// Функция для загрузки и вставки підкатегорій у підменю
async function loadSubcategories() {
    const mapping = {
        men: 'APPAREL',
        women: 'APPAREL',
        shoes: 'FOOTWEAR',
        accessories: 'EQUIPMENT'
    };
    for (const [key, apiType] of Object.entries(mapping)) {
        const submenu = document.getElementById(`${key}-submenu`);
        if (submenu) {
            submenu.innerHTML = '<li>Завантаження...</li>';
            try {
                const res = await fetch(`/api/filters/categories/${apiType}`);
                const subcats = await res.json();
                submenu.innerHTML = '';
                subcats.forEach(sub => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `/c/${key}/${encodeURIComponent(sub.toLowerCase())}`;
                    a.textContent = sub;
                    li.appendChild(a);
                    submenu.appendChild(li);
                });
                if (!subcats.length) submenu.innerHTML = '<li>Немає підкатегорій</li>';
            } catch (e) {
                submenu.innerHTML = '<li>Помилка завантаження</li>';
            }
        }
    }
}

// Загружаем шапку при загрузке страницы
document.addEventListener('DOMContentLoaded', loadHeader); 