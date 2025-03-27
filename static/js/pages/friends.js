// /static/js/pages/friends.js

class FriendsPage {
    constructor() {
        console.log('[FriendsPage] Создание экземпляра FriendsPage');
    }

    async init(container) {
        console.log('[FriendsPage] Инициализация страницы друзей');
        if (!container) {
            console.error('[FriendsPage] Ошибка: контейнер не передан в init');
            return;
        }

        const inviteButton = container.querySelector('.friends-button');
        if (inviteButton) {
            inviteButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[FriendsPage] Нажата кнопка "Пригласить друга"');
                // Ваш дальнейший код
            });
        }
    }

    cleanup() {
        console.log('[FriendsPage] Очистка страницы друзей');
        // Если нужно удалять обработчики событий,
        // отписаться и т.д., делаете это здесь
    }
}

// Делаем класс доступным глобально
window.FriendsPage = FriendsPage;
