let loadingTimer = null;
let isInitialized = false;
let fontLoadTimeout = 3000;

const SELECTORS = {
    warning: '.warning',
    loadingBar: '.loading-bar span',
    logo: '.logo'
};

class LoadingPage {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.loadingTimer = null;
    }

    async init(container) {
        this.container = container;
        console.log('[LoadingPage] Инициализация страницы загрузки');
        
        if (this.isInitialized) {
            console.log('[LoadingPage] Страница уже инициализирована');
            return;
        }

        await this.waitForElements();
        await this.initializeLoadingScreen();
        this.isInitialized = true;
    }

    async waitForElements() {
        const maxAttempts = 10;
        let attempts = 0;
        const checkInterval = 100;

        while (attempts < maxAttempts) {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) {
                console.log('[LoadingPage] Элементы загрузочного экрана найдены');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            attempts++;
        }
        console.warn('[LoadingPage] Не удалось найти элементы загрузочного экрана');
    }

    async initializeLoadingScreen() {
        const loadingScreen = document.getElementById('screen-loading');
        loadingScreen.classList.add('active');

        this.loadingTimer = setTimeout(() => {
            console.log('[LoadingPage] Время загрузки истекло, переход на главную страницу');
            this.cleanup();
        }, 4000);
    }

    async cleanup() {
        console.log('[LoadingPage] Очистка загрузочного экрана');

        if (this.loadingTimer) {
            clearTimeout(this.loadingTimer);
            this.loadingTimer = null;
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

        this.isInitialized = false;
        console.log('[LoadingPage] Очистка завершена');

        // Переход на главную страницу
        setTimeout(() => {
            console.log('[LoadingPage] Меняем hash на main');
            window.location.hash = 'main';
        }, 500);
    }
}

// Экспортируем класс глобально
window.LoadingPage = LoadingPage;

document.addEventListener('DOMContentLoaded', () => {
    console.log('[LoadingPage] DOM загружен, запуск init()');
    LoadingPage.init();
});