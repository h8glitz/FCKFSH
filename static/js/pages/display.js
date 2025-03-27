// /static/js/pages/display.js

class DisplayPage {
    constructor() {
        console.log("[DisplayPage] Создание экземпляра DisplayPage");
    }

    async init(container) {
        console.log("[DisplayPage] Инициализация страницы отображения");
        if (!container) {
            console.error("[DisplayPage] Ошибка: контейнер не передан в init");
            return;
        }

        this.setupEventListeners(container);
    }

    setupEventListeners(container) {
        const displayButton = container.querySelector(".display-button");
        if (displayButton) {
            displayButton.addEventListener("click", this.handleDisplayClick.bind(this));
        }
    }

    handleDisplayClick() {
        console.log("[DisplayPage] Кнопка отображения нажата");
        // Здесь можно добавить логику обработки отображения
    }

    cleanup() {
        console.log("[DisplayPage] Очистка страницы отображения");
    }
}

// Делаем класс доступным глобально
window.DisplayPage = DisplayPage;
