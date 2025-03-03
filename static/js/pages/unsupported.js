// unsupported.js

// Проверка устройства
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Логирование данных об устройстве
async function logDeviceInfo() {
    const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        touchSupport: ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    };

    try {
        await fetch('/log_device_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deviceInfo)
        });
    } catch (error) {
        console.error("Ошибка отправки информации об устройстве:", error);
    }
}

// Основная логика
document.addEventListener("DOMContentLoaded", () => {
    // Логирование устройства
    logDeviceInfo();

    // Проверяем устройство
    if (isMobileDevice()) {
        // Если устройство мобильное, перенаправляем на основную страницу
        window.location.href = "/templates/loading.html";
    } else {
        // Если устройство неподдерживаемое, оставляем на этой странице
        console.log("Неподдерживаемое устройство.");
    }
});
