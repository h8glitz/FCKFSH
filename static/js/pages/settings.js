// static/js/components/settings.js

export function initSettings() {
  const settingsIcon = document.querySelector('.settings-icon');
  const settingsModal = document.getElementById('settings-modal');
  const closeButton = document.getElementById('close-settings');

  // Функция открытия модального окна
  function openSettings() {
    settingsModal.style.display = 'block';
  }

  // Функция закрытия модального окна
  function closeSettings() {
    settingsModal.style.display = 'none';
  }

  // Обработчики событий
  if (settingsIcon) {
    settingsIcon.addEventListener('click', openSettings);
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeSettings);
  }

  // Закрытие модального окна при клике вне содержимого
  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      closeSettings();
    }
  });

  // Обработка кнопок внутри настроек
  const themeButtons = settingsModal.querySelectorAll('.horizontal-button .button-left, .horizontal-button .button-right');
  themeButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.classList.contains('button-left') && !button.classList.contains('russian')) {
        // Светлая тема
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      } else if (button.classList.contains('button-right') && !button.classList.contains('russian')) {
        // Тёмная тема
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      }

      if (button.classList.contains('button-left') && button.classList.contains('russian')) {
        // Русский язык
        setLanguage('ru');
      } else if (button.classList.contains('button-right') && button.classList.contains('russian')) {
        // Английский язык
        setLanguage('en');
      }
    });
  });

  // Обработка кнопки помощи
  const helpButton = settingsModal.querySelector('.help-button');
  if (helpButton) {
    helpButton.addEventListener('click', () => {
      alert('Помощь: Здесь можно настроить тему и язык приложения.');
    });
  }

  // Функция смены языка (пример)
  function setLanguage(lang) {
    // Здесь должна быть реализация смены языка вашего приложения
    // Например, можно перезагрузить страницу с параметром языка или использовать i18n библиотеку
    alert(`Язык изменен на: ${lang === 'ru' ? 'Русский' : 'English'}`);
  }
}

export function cleanupSettings() {
  const settingsIcon = document.querySelector('.settings-icon');
  const settingsModal = document.getElementById('settings-modal');
  const closeButton = document.getElementById('close-settings');

  if (settingsIcon) {
    settingsIcon.removeEventListener('click', openSettings);
  }

  if (closeButton) {
    closeButton.removeEventListener('click', closeSettings);
  }

  window.removeEventListener('click', outsideClickHandler);

  // Дополнительные очистки при необходимости
}
