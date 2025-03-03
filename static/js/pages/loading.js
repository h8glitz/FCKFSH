let loadingTimer = null;
let isInitialized = false;
let fontLoadTimeout = 3000;

const SELECTORS = {
    warning: '.warning',
    loadingBar: '.loading-bar span',
    logo: '.logo'
};

async function init() {
    console.log('[LoadingPage] Инициализация загрузочного экрана');

    if (isInitialized) {
        console.warn('[LoadingPage] Уже инициализировано, пропускаем');
        return true;
    }

    try {
        await waitForElements();
        await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('[LoadingPage] Время загрузки шрифтов истекло');
                    resolve();
                }, fontLoadTimeout);
            })
        ]);

        document.body.classList.add('fonts-loaded');
        document.body.style.visibility = 'visible';
        await initializeLoadingScreen();
        isInitialized = true;

        return true;
    } catch (error) {
        console.error('[LoadingPage] Ошибка инициализации:', error);
        document.body.style.visibility = 'visible';
        return false;
    }
}

async function waitForElements() {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const loadingScreen = document.getElementById('screen-loading');
        const logo = loadingScreen?.querySelector('.logo');
        const loadingBar = loadingScreen?.querySelector('.loading-bar span');

        if (loadingScreen && logo && loadingBar) {
            console.log('[LoadingPage] Все элементы найдены');
            return true;
        }

        console.log(`[LoadingPage] Ожидание элементов... Попытка ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }

    throw new Error('Не удалось найти необходимые элементы после максимального количества попыток');
}

async function initializeLoadingScreen() {
    const loadingScreen = document.getElementById('screen-loading');
    loadingScreen.classList.add('active');

    console.log('[LoadingPage] Запуск анимации загрузки');
    const loadingBar = document.querySelector(SELECTORS.loadingBar);
    if (loadingBar) {
        loadingBar.style.width = '100%';
    }

    loadingTimer = setTimeout(() => {
        console.log('[LoadingPage] Время загрузки истекло, переход на главную страницу');
        cleanup();
    }, 4000);
}

async function cleanup() {
    console.log('[LoadingPage] Очистка загрузочного экрана');

    if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
    }

    const loadingScreen = document.getElementById('screen-loading');
    if (loadingScreen) {
        loadingScreen.classList.remove('active');
        loadingScreen.style.display = 'none';
    }

    const mainScreen = document.getElementById('screen-main');
    if (mainScreen) {
        mainScreen.style.display = 'flex';
        console.log('[LoadingPage] Экран main теперь активен');
    } else {
        console.error('[LoadingPage] Экран main не найден!');
    }

    setTimeout(() => {
        console.log('[LoadingPage] Меняем hash на main');
        window.location.hash = 'main';
    }, 500);

    isInitialized = false;
    console.log('[LoadingPage] Очистка завершена');
}

window.LoadingPage = { init, cleanup };

document.addEventListener('DOMContentLoaded', () => {
    console.log('[LoadingPage] DOM загружен, запуск init()');
    LoadingPage.init();
});