class InfiniteScroll {
  constructor(options) {
    this.options = {
      container: options.container,
      loadingIndicator: options.loadingIndicator,
      fetchUrl: options.fetchUrl,
      pageSize: options.pageSize || 12,
      threshold: options.threshold || 500,
      onLoad: options.onLoad || (() => {}),
      onError: options.onError || (() => {}),
      onNoMore: options.onNoMore || (() => {}),
    };

    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.filters = options.filters || {};

    this.init();
  }

  init() {
    window.addEventListener("scroll", this.handleScroll.bind(this));
  }

  async handleScroll() {
    if (this.isLoading || !this.hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    if (scrollTop + clientHeight >= scrollHeight - this.options.threshold) {
      await this.fetchItems(this.currentPage + 1);
    }
  }

  async fetchItems(page = 1) {
    if (this.isLoading) return;
    this.isLoading = true;

    // Show loading indicator
    if (this.options.loadingIndicator) {
      this.options.loadingIndicator.style.display = "block";
    }

    // Clear container only if it's the first page
    if (page === 1) {
      this.options.container.innerHTML = "";
      this.hasMore = true;
    }

    try {
      const queryParams = new URLSearchParams({
        page,
        limit: this.options.pageSize,
        ...this.filters,
      });

      const response = await fetch(
        `${this.options.fetchUrl}?${queryParams.toString()}`,
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        // Call the onLoad callback with the new items
        this.options.onLoad(data.items, page);

        // Update pagination state
        this.currentPage = page;
        this.hasMore = page < data.totalPages;
      } else if (page === 1) {
        this.options.container.innerHTML =
          '<div class="no-items">No items found</div>';
        this.hasMore = false;
        this.options.onNoMore();
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      if (page === 1) {
        this.options.container.innerHTML =
          '<div class="error-message">Error loading items</div>';
      }
      this.hasMore = false;
      this.options.onError(error);
    } finally {
      this.isLoading = false;
      if (this.options.loadingIndicator) {
        this.options.loadingIndicator.style.display = "none";
      }
    }
  }

  updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.currentPage = 1;
    this.fetchItems(1);
  }

  reset() {
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.filters = {};
    this.fetchItems(1);
  }

  destroy() {
    window.removeEventListener("scroll", this.handleScroll.bind(this));
  }
}

// Example usage:
/*
const infiniteScroll = new InfiniteScroll({
    container: document.getElementById('items-container'),
    loadingIndicator: document.getElementById('loading'),
    fetchUrl: '/api/items',
    pageSize: 12,
    threshold: 500,
    onLoad: (items, page) => {
        items.forEach(item => {
            const element = createItemElement(item);
            container.appendChild(element);
        });
    },
    onError: (error) => {
        console.error('Error:', error);
    },
    onNoMore: () => {
        console.log('No more items to load');
    }
});

// Update filters
infiniteScroll.updateFilters({
    category: 'shoes',
    color: 'red'
});

// Reset
infiniteScroll.reset();

// Cleanup
infiniteScroll.destroy();
*/
