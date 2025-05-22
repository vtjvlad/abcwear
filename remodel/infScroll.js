function handleScroll() {
  if (isLoading || !hasMore) return;

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

  if (scrollTop + clientHeight >= scrollHeight - 500) {
    fetchProducts(currentPage + 1);
  }
}
window.addEventListener("scroll", handleScroll);
async function fetchProducts(page = 1) {
  if (isLoading) return;
  isLoading = true;

  // Показываем индикатор загрузки
  loadingIndicator.style.display = "block";

  // Очищаем контейнер только если это первая страница
  if (page === 1) {
    productsContainer.innerHTML = "";
    hasMore = true;
  }

  try {
    const queryParams = new URLSearchParams({
      page,
      limit: "12",
      ...currentFilters,
    });

    const response = await fetch(`/api/products?${queryParams.toString()}`);
    const data = await response.json();

    if (data.products && data.products.length > 0) {
      data.products.forEach((productGroup) => {
        // Используем первый продукт из группы как основной
        const mainProduct = productGroup[0];
        if (!mainProduct) return;

        // Создаем копию основного продукта и добавляем варианты
        const productWithVariants = {
          ...mainProduct,
          variants: productGroup.slice(1), // Все остальные продукты становятся вариантами
        };

        const card = createProductCard(productWithVariants);
        productsContainer.appendChild(card);
      });

      // Обновляем состояние пагинации
      currentPage = page;
      hasMore = page < data.totalPages;
    } else if (page === 1) {
      productsContainer.innerHTML =
        '<div class="no-products">Товары не найдены</div>';
      hasMore = false;
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    if (page === 1) {
      productsContainer.innerHTML =
        '<div class="error-message">Ошибка загрузки товаров</div>';
    }
    hasMore = false;
  } finally {
    isLoading = false;
    loadingIndicator.style.display = "none";
  }
}
