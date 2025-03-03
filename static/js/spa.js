// Конфигурация маршрутов
const ROUTES = {
    "loading": { template: "loading", script: "/static/js/pages/loading.js" },
    "main": { template: "main", script: "/static/js/pages/main.js" },
    "unsupported": { template: "unsupported", script: "/static/js/pages/unsupported.js" },
    "news": { template: "news", script: "/static/js/pages/news.js" },
    "friends": { template: "friends", script: "/static/js/pages/friends.js" },
    "brand": { template: "brand", script: "/static/js/pages/brand.js" },
    "menu": { template: "menu", script: "/static/js/pages/menu.js" },
};

// Класс для определения устройства и браузера
class DeviceDetector {
    static getInfo() {
        const userAgent = navigator.userAgent;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const devicePixelRatio = window.devicePixelRatio || 1;

        return {
            userAgent,
            deviceType: this.getDeviceType(userAgent),
            os: this.getOS(userAgent),
            browser: this.getBrowser(userAgent),
            screenWidth,
            screenHeight,
            devicePixelRatio
        };
    }

    static getDeviceType(userAgent) {
        if (/Mobi|Android|iPhone|iPad|iPod/.test(userAgent)) return "Mobile";
        if (/Tablet|iPad/.test(userAgent)) return "Tablet";
        return "Desktop";
    }

    static getOS(userAgent) {
        if (/Windows/.test(userAgent)) return "Windows";
        if (/Mac/.test(userAgent)) return "MacOS";
        if (/Android/.test(userAgent)) return "Android";
        if (/iOS|iPhone|iPad|iPod/.test(userAgent)) return "iOS";
        if (/Linux/.test(userAgent)) return "Linux";
        return "Unknown OS";
    }

    static getBrowser(userAgent) {
        if (/Chrome/.test(userAgent) && !/Edge|OPR/.test(userAgent)) return "Chrome";
        if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) return "Safari";
        if (/Firefox/.test(userAgent)) return "Firefox";
        if (/Edge/.test(userAgent)) return "Edge";
        if (/OPR|Opera/.test(userAgent)) return "Opera";
        return "Unknown Browser";
    }

    static async sendInfoToServer() {
        try {
            const response = await fetch('/log-device-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.getInfo())
            });
            console.log("[DeviceDetector] Данные об устройстве отправлены на сервер");
        } catch (error) {
            console.error("[DeviceDetector] Ошибка отправки данных:", error);
        }
    }
}

// Класс для управления шаблонами
class TemplateManager {
    static async loadTemplate(templateName) {
        console.log(`[TemplateManager] Загружаем шаблон: ${templateName}.html`);
        try {
            const response = await fetch(`/templates/${templateName}.html`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            console.log(`[TemplateManager] Шаблон '${templateName}' загружен`);
            return text;
        } catch (error) {
            console.error('[TemplateManager] Ошибка загрузки шаблона:', error);
            return null;
        }
    }

    static async loadFooter() {
        try {
            const html = await this.loadTemplate('footer');
            const footerEl = document.getElementById('footer-container');
            if (footerEl) {
                footerEl.innerHTML = html;
            }
        } catch (error) {
            console.error('[TemplateManager] Не удалось загрузить футер:', error);
        }
    }
}

// Класс для управления скриптами страниц
class ScriptLoader {
    static async loadPageScript(scriptUrl, routeName) {
        console.log(`[ScriptLoader] Загружаем скрипт: ${scriptUrl}`);
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = scriptUrl;
            
            script.onload = () => {
                console.log(`[ScriptLoader] Скрипт загружен: ${scriptUrl}`);
                const pageObjectName = this.getPageObjectName(routeName);
                
                if (window[pageObjectName]?.init) {
                    console.log(`[ScriptLoader] Вызываем ${pageObjectName}.init()`);
                    window[pageObjectName].init();
                } else {
                    console.warn(`[ScriptLoader] Объект ${pageObjectName} или его метод init не найден`);
                }
                
                resolve(scriptUrl);
            };
            
            script.onerror = () => {
                const error = new Error(`Ошибка загрузки скрипта: ${scriptUrl}`);
                console.error('[ScriptLoader]', error);
                reject(error);
            };
            
            document.body.appendChild(script);
        });
    }

    static getPageObjectName(routeName) {
        return routeName.charAt(0).toUpperCase() + 
               routeName.slice(1).toLowerCase() + 'Page';
    }
}

// Основной класс роутера
class Router {
    constructor() {
        this.currentRoute = null;
        this.currentPageScript = null;
        this.isRouteRendering = false;
    }

    getRoute() {
        const hash = window.location.hash.slice(1).trim();
        const route = hash.split(/[?&]/)[0];
        console.log(`[Router] Определён маршрут: '${route}'`);
        
        if (!ROUTES[route]) {
            console.warn(`[Router] Неизвестный маршрут: '${route}', загружаем 'loading'`);
            return "loading";
        }
        return route;
    }

    async showPage(route) {
        console.log(`[Router] Переход на страницу: '${route}'`);
        const routeConfig = ROUTES[route];
        if (!routeConfig) {
            console.error(`[Router] Ошибка: маршрут '${route}' не найден в ROUTES`);
            return;
        }

        const container = document.getElementById(`screen-${routeConfig.template}`);
        console.log(`[Router] Контейнер найден? ${!!container}`);

        const content = await TemplateManager.loadTemplate(routeConfig.template);
        if (!content) {
            console.error(`[Router] Ошибка загрузки шаблона: ${routeConfig.template}.html`);
            container.innerHTML = '<div class="error">Ошибка загрузки страницы</div>';
            return;
        }

        this.hideAllScreens();
        this.showScreen(container, content);
        this.updateFooterVisibility(route);
    }

    hideAllScreens() {
        document.querySelectorAll('#app > div').forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active-screen');
        });
    }

    showScreen(container, content) {
        container.style.display = 'flex';
        container.classList.add('active-screen');
        container.innerHTML = content;
    }

    updateFooterVisibility(route) {
        const footer = document.getElementById('footer-container');
        if (footer) {
            const showFooterRoutes = ['main', 'news','brand' , 'friends', 'menu'];
            footer.style.display = showFooterRoutes.includes(route) ? 'block' : 'none';
        }
    }

    async renderRoute() {
        console.log("[Router] Начинаем рендеринг маршрута");
        if (this.isRouteRendering) {
            console.log("[Router] Уже выполняется рендеринг, пропускаем");
            return;
        }

        this.isRouteRendering = true;
        try {
            const route = this.getRoute();
            console.log(`[Router] Маршрут для рендеринга: '${route}'`);
            
            await this.showPage(route);

            if (ROUTES[route]?.script) {
                this.currentPageScript = await ScriptLoader.loadPageScript(
                    ROUTES[route].script,
                    route
                );
            }
            
            this.currentRoute = route;
            console.log(`[Router] Страница успешно отрисована: '${route}'`);
        } catch (error) {
            console.error('[Router] Ошибка рендеринга:', error);
            await this.showPage('loading');
            if (ROUTES.loading?.script) {
                this.currentPageScript = await ScriptLoader.loadPageScript(
                    ROUTES.loading.script,
                    'loading'
                );
            }
            this.currentRoute = 'loading';
        } finally {
            this.isRouteRendering = false;
            console.log("[Router] Рендеринг завершен");
        }
    }
}

// Инициализация приложения
class App {
    constructor() {
        this.router = new Router();
    }

    async init() {
        await DeviceDetector.sendInfoToServer();
        await TemplateManager.loadFooter();

        window.location.hash = "loading";
        this.router.renderRoute();

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('hashchange', () => {
            console.log("[App] Обнаружено изменение хэша, перерендер страницы");
            this.router.renderRoute();
        });
    }
}

// Запуск приложения
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});