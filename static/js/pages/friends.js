// /static/js/pages/friends.js

export async function init() {
    console.log('[Friends] init...');
    // Здесь можно добавить логику,
    // например, событие на кнопку "Пригласить друга"
    const inviteButton = document.querySelector('.friends-button');
    if (inviteButton) {
        inviteButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[Friends] Нажата кнопка "Пригласить друга"');
            // Ваш дальнейший код
        });
    }
}

export async function cleanup() {
    console.log('[Friends] cleanup...');
    // Если нужно удалять обработчики событий,
    // отписаться и т.д., делаете это здесь
}
