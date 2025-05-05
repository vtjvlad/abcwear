// === Universal Loader Injector ===
(function () {
  // 1. Подключить стили, если не подключены
  var loaderCssHref = '/css/loader.css';
  var cssAlready = Array.from(document.styleSheets).some(
    (s) => s.href && s.href.includes(loaderCssHref)
  );
  if (!cssAlready) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = loaderCssHref;
    document.head.appendChild(link);
  }

  // 2. Добавить HTML лоадера, если его нет
  if (!document.querySelector('.page-loader')) {
    var loaderDiv = document.createElement('div');
    loaderDiv.className = 'page-loader';
    loaderDiv.innerHTML =
      '<div class="loader-content"><span class="loader-u">U</span><span class="loader-dot">.</span></div>';
    document.body.insertBefore(loaderDiv, document.body.firstChild);
  }

  // 3. Логика скрытия лоадера
  function hideLoader() {
    var loader = document.querySelector('.page-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(function () {
        loader.remove();
      }, 500);
    }
  }
  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
})();
