class GamesPage {
    constructor() {
        console.log('[Games] Создание экземпляра GamesPage');
        // Привязываем контекст к методам
        this.handleGameClick = this.handleGameClick.bind(this);
    }

    async init() {
        console.log('[Games] Инициализация страницы мини-игр');

        const gameButtons = document.querySelectorAll('.minigames-button');
        gameButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => this.handleGameClick(e, index));
            button.style.cursor = 'pointer';
        });
    }

    handleGameClick(e, index) {
        const gameRoutes = ["clicker", "game2", "game3", "game4"];

        const title = e.currentTarget.closest(".minigames-card").querySelector("img").alt;
        console.log(`[Games] Clicked game: ${title}`);

        e.currentTarget.classList.add("clicked");

        if (index < gameRoutes.length) {
            console.log(`[Games] Переход к: #${gameRoutes[index]}`);
            window.location.hash = gameRoutes[index]; // Меняем хеш на нужный маршрут
        } else {
            console.warn("[Games] Неизвестный индекс игры");
        }
    }

    cleanup() {
        console.log('[Games] Очистка страницы мини-игр');
        const gameButtons = document.querySelectorAll('.minigames-button');
        gameButtons.forEach(button => {
            button.removeEventListener('click', this.handleGameClick);
        });
    }
}

// Делаем доступным глобально
window.GamesPage = GamesPage;

// Экспортируем корректно
export default GamesPage;