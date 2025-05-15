/**
 * Класс для управления SEO-фильтрами и метаданными
 * Отвечает за динамическое обновление мета-тегов, структурированных данных
 * и других SEO-элементов на странице
 */
class SEOFilters {
    constructor() {
        // Хранит текущие активные фильтры
        this.currentFilters = {};
        // Хранит текущие метаданные страницы
        this.metadata = null;
    }

    /**
     * Обновляет все метаданные страницы
     * @param {Object} metadata - Объект с метаданными страницы
     */
    updatePageMetadata(metadata) {
        // Обновление title страницы
        document.title = metadata.title;

        // Обновление meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = metadata.description;

        // Обновление meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = metadata.keywords;

        // Обновление Open Graph тегов для соцсетей
        this.updateMetaTag('og:title', metadata.ogTitle);
        this.updateMetaTag('og:description', metadata.ogDescription);
        if (metadata.ogImage) {
            this.updateMetaTag('og:image', metadata.ogImage);
        }

        // Обновление canonical URL для предотвращения дублей
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.rel = 'canonical';
            document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = window.location.origin + metadata.canonicalUrl;

        // Добавление структурированных данных для поисковых систем
        this.updateStructuredData(metadata.structuredData);
        
        // Добавление хлебных крошек для навигации
        if (metadata.breadcrumbs) {
            this.updateBreadcrumbs(metadata.breadcrumbs);
        }
    }

    /**
     * Обновляет отдельный meta тег
     * @param {string} property - Название свойства (например, 'og:title')
     * @param {string} content - Содержимое тега
     */
    updateMetaTag(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    /**
     * Обновляет структурированные данные (JSON-LD)
     * @param {Object} data - Объект с структурированными данными
     */
    updateStructuredData(data) {
        let script = document.querySelector('script[type="application/ld+json"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
    }

    /**
     * Обновляет хлебные крошки
     * @param {Object} breadcrumbs - Объект с данными хлебных крошек
     */
    updateBreadcrumbs(breadcrumbs) {
        let script = document.querySelector('script[type="application/ld+json"][data-breadcrumbs]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-breadcrumbs', 'true');
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(breadcrumbs);
    }

    /**
     * Получает SEO метаданные для страницы с фильтрами
     * @param {Object} filters - Объект с параметрами фильтрации
     * @returns {Promise<Object>} Объект с метаданными
     */
    async getFiltersMetadata(filters) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/filters/seo/metadata?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch SEO metadata');
            
            const metadata = await response.json();
            this.metadata = metadata;
            this.updatePageMetadata(metadata);
            return metadata;
        } catch (error) {
            console.error('Error fetching SEO metadata:', error);
            return null;
        }
    }

    /**
     * Получает SEO метаданные для страницы категории
     * @param {string} category - Название категории
     * @returns {Promise<Object>} Объект с метаданными
     */
    async getCategoryMetadata(category) {
        try {
            const response = await fetch(`/api/categories/${category}/seo`);
            if (!response.ok) throw new Error('Failed to fetch category SEO metadata');
            
            const metadata = await response.json();
            this.metadata = metadata;
            this.updatePageMetadata(metadata);
            return metadata;
        } catch (error) {
            console.error('Error fetching category SEO metadata:', error);
            return null;
        }
    }

    /**
     * Получает SEO метаданные для страницы продукта
     * @param {string} productId - ID продукта
     * @returns {Promise<Object>} Объект с метаданными
     */
    async getProductMetadata(productId) {
        try {
            const response = await fetch(`/api/products/${productId}/seo`);
            if (!response.ok) throw new Error('Failed to fetch product SEO metadata');
            
            const metadata = await response.json();
            this.metadata = metadata;
            this.updatePageMetadata(metadata);
            return metadata;
        } catch (error) {
            console.error('Error fetching product SEO metadata:', error);
            return null;
        }
    }

    /**
     * Получает SEO ключевые слова для оптимизации
     * @returns {Promise<Array>} Массив ключевых слов
     */
    async getSEOKeywords() {
        try {
            const response = await fetch('/api/filters/seo');
            if (!response.ok) throw new Error('Failed to fetch SEO keywords');
            
            const keywords = await response.json();
            return keywords;
        } catch (error) {
            console.error('Error fetching SEO keywords:', error);
            return null;
        }
    }
}

// Создание глобального экземпляра SEOFilters
const seoFilters = new SEOFilters();

// Экспорт для использования в других модулях
window.seoFilters = seoFilters;