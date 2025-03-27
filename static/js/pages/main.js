import * as THREE from '/static/js/libs/three.module.js';
import { GLTFLoader } from '/static/js/libs/GLTFLoader.js';
import { OrbitControls } from '/static/js/libs/OrbitControls.js';
import { DRACOLoader } from '/static/js/libs/DRACOLoader.js';

// Константы
const CONSTANTS = {
    DEFAULT_AVATAR: "/static/icons/default-avatar.png",
    AVATAR_MODEL_PATH: '/static/models/avatars/avatar.glb',
    T_SHIRT_MODEL_PATH: '/static/models/clotches/t-shirt.glb',
    DRACO_DECODER_PATH: '/static/js/libs/draco/',
    CAMERA: {
        FOV: 60,
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_POSITION: new THREE.Vector3(6.29, 1.40, 12.96),
        TARGET: new THREE.Vector3(0, 1, 0)
    },
    CONTROLS: {
        MIN_POLAR_ANGLE: Math.PI * 0.25,
        MAX_POLAR_ANGLE: Math.PI * 0.75,
        MIN_AZIMUTH_ANGLE: -Math.PI,
        MAX_AZIMUTH_ANGLE: Math.PI
    },
    LONG_PRESS_DURATION: 800 // Длительность удержания для активации скрытого меню (в мс)
};

// Утилиты для работы с DOM
class DOMUtils {
    static waitForElement(selector) {
        return new Promise(resolve => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            const observer = new MutationObserver((mutations, obs) => {
                const foundElement = document.querySelector(selector);
                if (foundElement) {
                    obs.disconnect();
                    resolve(foundElement);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    static loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    static createHiddenMenuButtons() {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'hidden-menu-buttons';
        buttonsContainer.style.position = 'absolute';
        buttonsContainer.style.width = '100%';
        buttonsContainer.style.height = '100%';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.alignItems = 'center';
        buttonsContainer.style.padding = '20px';
        buttonsContainer.style.boxSizing = 'border-box';
        buttonsContainer.style.zIndex = '100';
        buttonsContainer.style.pointerEvents = 'none'; // Чтобы клики проходили через контейнер к кнопкам

        // Создаем кнопки по бокам
        const leftButtons = document.createElement('div');
        leftButtons.className = 'hidden-menu-side left';
        leftButtons.style.display = 'flex';
        leftButtons.style.flexDirection = 'column';
        leftButtons.style.gap = '20px';
        leftButtons.style.pointerEvents = 'auto';

        const rightButtons = document.createElement('div');
        rightButtons.className = 'hidden-menu-side right';
        rightButtons.style.display = 'flex';
        rightButtons.style.flexDirection = 'column';
        rightButtons.style.gap = '20px';
        rightButtons.style.pointerEvents = 'auto';

        // Определяем кнопки для левой стороны
        const leftButtonsData = [
            { id: 'wardrobe-button', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19,6h-4.2C14.4,3.8,12.4,2,10,2S5.6,3.8,5.2,6H1C0.4,6,0,6.4,0,7v11c0,0.6,0.4,1,1,1h18c0.6,0,1-0.4,1-1V7C20,6.4,19.6,6,19,6z M10,4c1.3,0,2.4,0.8,2.8,2H7.2C7.6,4.8,8.7,4,10,4z M18,17H2V8h16V17z"/></svg>', text: 'Гардероб' },
            { id: 'inventory-button', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V4C20,2.9,19.1,2,18,2z M18,20H6V4h12V20z"/><path d="M13,10h3v3h-3v-3z"/><path d="M8,10h3v3H8v-3z"/></svg>', text: 'Инвентарь' },
            { id: 'background-button', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M3,3v18h18V3H3z M20,20H4V4h16V20z"/><path d="M6,7h12v10H6V7z"/></svg>', text: 'Фон' }
        ];

        // Определяем кнопки для правой стороны
        const rightButtonsData = [
            { id: 'hide-button', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12,4C7,4,2.7,7.6,1,12c1.7,4.4,6,8,11,8s9.3-3.6,11-8C21.3,7.6,17,4,12,4z M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6S15.3,18,12,18z"/><path d="M15.9,8.1C14.8,7,13.5,6.5,12,6.5s-2.8,0.6-3.9,1.6c-2.1,2.1-2.1,5.6,0,7.8c1.1,1.1,2.4,1.6,3.9,1.6s2.8-0.6,3.9-1.6C18,13.7,18,10.2,15.9,8.1z M14.5,14.5c-0.7,0.7-1.5,1-2.5,1s-1.9-0.4-2.5-1c-1.4-1.4-1.4-3.6,0-5c0.7-0.7,1.5-1,2.5-1s1.9,0.4,2.5,1C15.9,10.9,15.9,13.1,14.5,14.5z"/><line x1="4" y1="4" x2="20" y2="20" stroke="white" stroke-width="2"/></svg>', text: 'Скрыть' },
            { id: 'avatar-button', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="4"/><path d="M12,14c-4.4,0-8,3.6-8,8h16C20,17.6,16.4,14,12,14z"/></svg>', text: 'Аватар' }
        ];

        // Функция создания кнопки
        const createButton = (data) => {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.gap = '5px';

            const button = document.createElement('button');
            button.id = data.id;
            button.className = 'hidden-menu-button';
            button.innerHTML = data.icon;
            button.style.width = '60px';
            button.style.height = '60px';
            button.style.padding = '0';
            button.style.backgroundColor = '#000000';
            button.style.border = 'none';
            button.style.borderRadius = '50%';
            button.style.cursor = 'pointer';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
            button.style.transition = 'transform 0.2s ease-in-out';

            // Добавляем эффект при наведении
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });

            // Добавляем текст под кнопкой
            const label = document.createElement('div');
            label.textContent = data.text;
            label.style.fontSize = '14px';
            label.style.color = '#000000';
            label.style.fontWeight = 'bold';
            label.style.textAlign = 'center';

            buttonContainer.appendChild(button);
            buttonContainer.appendChild(label);

            return buttonContainer;
        };

        // Добавляем кнопки на левую сторону
        leftButtonsData.forEach(data => {
            leftButtons.appendChild(createButton(data));
        });

        // Добавляем кнопки на правую сторону
        rightButtonsData.forEach(data => {
            rightButtons.appendChild(createButton(data));
        });

        buttonsContainer.appendChild(leftButtons);
        buttonsContainer.appendChild(rightButtons);

        return buttonsContainer;
    }
}

// Класс для управления данными пользователя
class UserManager {
    constructor() {
        this.userData = null;
    }

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('id');

        if (!userId && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
            console.log("[MainPage] Взяли user_id из Telegram:", userId);
        }

        if (!userId) {
            console.error('[MainPage] Ошибка: user_id не найден!');
            return null;
        }
        return userId;
    }

    async fetchUserData() {
        try {
            const userId = this.getUserId();
            if (!userId) return null;

            let username = "unknown";
            let photoUrl = "";

            if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
                const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
                username = tgUser.username || "unknown";
                photoUrl = tgUser.photo_url || "";
            }

            const response = await fetch('/get_user_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId })
            });

            if (!response.ok) {
                throw new Error(`Ошибка API (get_user_data): ${response.status}`);
            }

            this.userData = await response.json();
            console.log('[MainPage] Получены данные пользователя:', this.userData);
            return this.userData;
        } catch (error) {
            console.error('[MainPage] Ошибка получения данных пользователя:', error);
            return null;
        }
    }

    async updateInterface() {
        const userData = this.userData;
        if (!userData) return;

        let photoUrl = userData.photo_url || CONSTANTS.DEFAULT_AVATAR;
        if (photoUrl.startsWith('AgAC')) {
            photoUrl = `/get_avatar?photo_url=${encodeURIComponent(photoUrl)}`;
        }

        try {
            const avatarElement = await DOMUtils.waitForElement("#user-avatar");
            if (avatarElement) {
                try {
                    await DOMUtils.loadImage(photoUrl);
                    avatarElement.src = photoUrl;
                } catch (error) {
                    avatarElement.src = CONSTANTS.DEFAULT_AVATAR;
                }
            }

            const nicknameElement = await DOMUtils.waitForElement("#user-nickname");
            if (nicknameElement) {
                nicknameElement.textContent = userData.username || "No Name";
            }
        } catch (error) {
            console.error('[MainPage] Ошибка обновления интерфейса:', error);
        }
    }
}

// Класс для управления 3D сценой
class Scene3DManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        this.avatar = null;
        this.isHiddenMenuMode = false;
        this.originalBackgroundColor = new THREE.Color('#e1e1e1');
    }

    async initialize() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            throw new Error('[MainPage] Контейнер для 3D не найден');
        }

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initControls();
        this.initLights();
        await this.loadModel();
        this.animate();
        this.bindEvents();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = this.originalBackgroundColor;
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            CONSTANTS.CAMERA.FOV,
            this.container.clientWidth / this.container.clientHeight,
            CONSTANTS.CAMERA.NEAR,
            CONSTANTS.CAMERA.FAR
        );
        this.camera.position.copy(CONSTANTS.CAMERA.INITIAL_POSITION);
        this.camera.lookAt(CONSTANTS.CAMERA.TARGET);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.copy(CONSTANTS.CAMERA.TARGET);
        this.controls.enableZoom = false;
        this.controls.minAzimuthAngle = CONSTANTS.CONTROLS.MIN_AZIMUTH_ANGLE;
        this.controls.maxAzimuthAngle = CONSTANTS.CONTROLS.MAX_AZIMUTH_ANGLE;
        this.controls.minPolarAngle = CONSTANTS.CONTROLS.MIN_POLAR_ANGLE;
        this.controls.maxPolarAngle = CONSTANTS.CONTROLS.MAX_POLAR_ANGLE;
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(0, 10, 10);
        this.scene.add(ambientLight, dirLight);
    }

    async loadModel() {
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(CONSTANTS.DRACO_DECODER_PATH);
        gltfLoader.setDRACOLoader(dracoLoader);

        console.log('[Debug] Начало загрузки моделей');
        console.log('[Debug] Путь к аватару:', CONSTANTS.AVATAR_MODEL_PATH);
        console.log('[Debug] Путь к футболке:', CONSTANTS.T_SHIRT_MODEL_PATH);

        return new Promise((resolve, reject) => {
            // Сначала загружаем аватар
            gltfLoader.load(
                CONSTANTS.AVATAR_MODEL_PATH,
                (gltf) => {
                    this.avatar = gltf.scene;
                    this.avatar.scale.set(1, 1, 1);
                    this.scene.add(this.avatar);

                    // Логируем структуру аватара
                    console.log('[Debug] Структура аватара:');
                    this.logSceneStructure(this.avatar);

                    // После загрузки аватара загружаем футболку
                    gltfLoader.load(
                        CONSTANTS.T_SHIRT_MODEL_PATH,
                        (gltf) => {
                            this.tShirt = gltf.scene;

                            // Логируем структуру футболки
                            console.log('[Debug] Структура футболки:');
                            this.logSceneStructure(this.tShirt);

                            if (this.avatar) {
                                // Масштабируем футболку под размер аватара (в 3 раза меньше)
                                const avatarBoundingBox = new THREE.Box3().setFromObject(this.avatar);
                                const tShirtBoundingBox = new THREE.Box3().setFromObject(this.tShirt);
                                
                                const avatarHeight = avatarBoundingBox.max.y - avatarBoundingBox.min.y;
                                const tShirtHeight = tShirtBoundingBox.max.y - tShirtBoundingBox.min.y;
                                
                                const scale = (avatarHeight / tShirtHeight) / 3 * 1.20; // Увеличиваем на 20%
                                this.tShirt.scale.set(scale, scale, scale);

                                // Центрируем футболку относительно аватара и опускаем ниже
                                this.tShirt.position.set(0, 0, 0); // Опускаем на 5% ниже

                                // Попытка найти торс разными способами
                                let attachmentPoint = null;
                                const searchNames = ['Torso', 'torso', 'Body', 'Spine', 'spine', 'Hips', 'hips'];

                                for (let name of searchNames) {
                                    attachmentPoint = this.avatar.getObjectByName(name);
                                    if (attachmentPoint) {
                                        console.log(`[Debug] Найден торс: ${name}`);
                                        break;
                                    }
                                }

                                if (attachmentPoint) {
                                    // Добавляем футболку как дочерний объект торса
                                    attachmentPoint.add(this.tShirt);
                                    
                                    // Настраиваем позицию футболки относительно торса
                                    this.tShirt.position.set(0, -0.05, 0); // Опускаем на 5% ниже
                                    this.tShirt.rotation.set(0, 0, 0);
                                } else {
                                    console.warn('[Debug] Торс не найден, добавляем футболку в сцену');
                                    this.scene.add(this.tShirt);
                                }
                            }

                            resolve();
                        },
                        (progress) => {
                            console.log('[Debug] Прогресс загрузки футболки:', progress);
                        },
                        (error) => {
                            console.error('[Debug] Ошибка загрузки футболки:', error);
                            reject(error);
                        }
                    );
                },
                (progress) => {
                    console.log('[Debug] Прогресс загрузки аватара:', progress);
                },
                (error) => {
                    console.error('[Debug] Ошибка загрузки аватара:', error);
                    reject(error);
                }
            );
        });
    }

    // Вспомогательный метод для логирования структуры сцены
    logSceneStructure(scene, indent = '') {
        console.log(`${indent}Объект:`, scene.name || 'Без имени');
        if (scene.children) {
            scene.children.forEach(child => {
                this.logSceneStructure(child, indent + '  ');
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        if (this.camera && this.renderer && this.container) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        }
    }

    cleanup() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        if (this.controls) {
            this.controls.dispose();
        }
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }

    // Методы для скрытого меню
    enableHiddenMenu() {
        if (this.isHiddenMenuMode) return;

        console.log('[MainPage] Активация скрытого меню');
        this.isHiddenMenuMode = true;

        // Меняем цвет фона на белый
        this.scene.background = new THREE.Color('#e3e2e3');

        // Скрываем все интерфейсные элементы
        const uiElements = document.querySelectorAll('.main-ui:not(#avatar-3d-container)');
        uiElements.forEach(el => {
            el.style.transition = 'opacity 0.3s ease-in-out';
            el.style.opacity = '0';
            setTimeout(() => {
                el.style.display = 'none';
            }, 300);
        });

        // Настраиваем вид модели для скрытого меню
        if (this.avatar) {
            // Сохраняем текущее положение камеры, если необходимо
            this.originalCameraPosition = this.camera.position.clone();
            this.originalControlsTarget = this.controls.target.clone();

            // Центрируем камеру на аватаре, если нужно
            // this.camera.position.set(0, 2, 8);
            // this.controls.target.set(0, 1, 0);
        }

        // Отображаем кнопки скрытого меню
        if (!document.getElementById('hidden-menu-buttons')) {
            const hiddenMenuButtons = DOMUtils.createHiddenMenuButtons();
            this.container.parentNode.appendChild(hiddenMenuButtons);

            // Устанавливаем обработчики для кнопок
            this.initHiddenMenuButtonHandlers();
        } else {
            document.getElementById('hidden-menu-buttons').style.display = 'flex';
        }
    }

    disableHiddenMenu() {
        if (!this.isHiddenMenuMode) return;

        console.log('[MainPage] Деактивация скрытого меню');
        this.isHiddenMenuMode = false;

        // Возвращаем оригинальный цвет фона
        this.scene.background = this.originalBackgroundColor;

        // Скрываем кнопки скрытого меню
        const hiddenMenuButtons = document.getElementById('hidden-menu-buttons');
        if (hiddenMenuButtons) {
            hiddenMenuButtons.style.display = 'none';
        }

        // Возвращаем камеру в исходное положение, если мы её меняли
        if (this.originalCameraPosition && this.originalControlsTarget) {
            // this.camera.position.copy(this.originalCameraPosition);
            // this.controls.target.copy(this.originalControlsTarget);
        }

        // Отображаем интерфейсные элементы обратно
        const uiElements = document.querySelectorAll('.main-ui:not(#avatar-3d-container)');
        uiElements.forEach(el => {
            el.style.display = '';
            // Небольшая задержка перед возвращением прозрачности для плавной анимации
            setTimeout(() => {
                el.style.opacity = '1';
            }, 10);
        });
    }

    initHiddenMenuButtonHandlers() {
        // Обработчик для кнопки "Скрыть"
        const hideButton = document.getElementById('hide-button');
        if (hideButton) {
            hideButton.addEventListener('click', () => {
                this.disableHiddenMenu();
            });
        }

        // Обработчики для остальных кнопок можно добавить здесь
        // Например:

        // Гардероб
        const wardrobeButton = document.getElementById('wardrobe-button');
        if (wardrobeButton) {
            wardrobeButton.addEventListener('click', () => {
                console.log('[MainPage] Нажата кнопка Гардероб');
                // Логика открытия гардероба
            });
        }

        // Инвентарь
        const inventoryButton = document.getElementById('inventory-button');
        if (inventoryButton) {
            inventoryButton.addEventListener('click', () => {
                console.log('[MainPage] Нажата кнопка Инвентарь');
                // Логика открытия инвентаря
            });
        }

        // Фон
        const backgroundButton = document.getElementById('background-button');
        if (backgroundButton) {
            backgroundButton.addEventListener('click', () => {
                console.log('[MainPage] Нажата кнопка Фон');
                // Логика изменения фона
            });
        }

        // Аватар
        const avatarButton = document.getElementById('avatar-button');
        if (avatarButton) {
            avatarButton.addEventListener('click', () => {
                console.log('[MainPage] Нажата кнопка Аватар');
                // Логика настройки аватара
            });
        }
    }
}

// Класс для управления событиями долгого нажатия
class LongPressManager {
    constructor(scene3DManager) {
        this.scene3DManager = scene3DManager;
        this.pressTimer = null;
        this.isLongPress = false;
    }

    init() {
        const container = document.getElementById('avatar-3d-container');
        if (!container) {
            console.error('[MainPage] Контейнер для долгого нажатия не найден');
            return;
        }

        // Обработчики событий для мобильных устройств
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        // Обработчики событий для компьютеров
        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        container.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.startLongPress();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.endLongPress();
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.cancelLongPress();
    }

    handleMouseDown(e) {
        this.startLongPress();
    }

    handleMouseUp(e) {
        this.endLongPress();
    }

    handleMouseLeave(e) {
        this.cancelLongPress();
    }

    startLongPress() {
        if (this.pressTimer === null) {
            this.isLongPress = false;
            this.pressTimer = setTimeout(() => {
                this.isLongPress = true;
                this.scene3DManager.enableHiddenMenu();
            }, CONSTANTS.LONG_PRESS_DURATION);
        }
    }

    endLongPress() {
        if (this.pressTimer !== null) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;

            // Не делаем никаких действий при коротком нажатии
        }
    }

    cancelLongPress() {
        if (this.pressTimer !== null) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
    }
}

// Основной класс приложения
class MainPage {
    constructor() {
        console.log('[MainPage] Создание экземпляра MainPage');
        this.userManager = new UserManager();
        this.scene3DManager = null;
        this.longPressManager = null;
        this.hiddenMenuButtons = null;
        this.isHiddenMenuEnabled = false;
        
        // Привязываем контекст к методам
        this.handleSettingsClick = this.handleSettingsClick.bind(this);
        this.closeSettings = this.closeSettings.bind(this);
    }

    async init() {
        console.log('[MainPage] Инициализация страницы');
        
        // Инициализация менеджера пользователя
        await this.userManager.fetchUserData();
        await this.userManager.updateInterface();

        // Инициализация 3D сцены
        this.scene3DManager = new Scene3DManager('avatar-3d-container');
        await this.scene3DManager.initialize();

        // Инициализация менеджера длительного нажатия
        this.longPressManager = new LongPressManager(this.scene3DManager);
        this.longPressManager.init();

        // Добавляем классы для стилей
        this.addMainUIClass();
        this.addMobileStyles();

        // Инициализация обработчиков настроек
        this.initSettingsHandlers();
    }

    initSettingsHandlers() {
        console.log('[MainPage] Инициализация обработчиков настроек');
        
        // Обработчик клика по иконке настроек
        const settingsIcon = document.querySelector('.settings-icon');
        if (settingsIcon) {
            settingsIcon.addEventListener('click', this.handleSettingsClick);
            settingsIcon.style.cursor = 'pointer';
        }

        // Обработчик закрытия настроек
        const closeButton = document.getElementById('close-settings');
        if (closeButton) {
            closeButton.addEventListener('click', this.closeSettings);
        }

        // Обработчик клика вне модального окна
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeSettings();
                }
            });
        }
    }

    handleSettingsClick(e) {
        e.stopPropagation();
        console.log('[MainPage] Открываем настройки');
        
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            settingsModal.classList.add('active');
        } else {
            console.error('[MainPage] Модальное окно настроек не найдено');
        }
    }

    closeSettings() {
        console.log('[MainPage] Закрываем настройки');
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
            settingsModal.classList.remove('active');
        }
    }

    cleanup() {
        console.log('[MainPage] Очистка страницы');
        
        // Удаляем обработчики настроек
        const settingsIcon = document.querySelector('.settings-icon');
        if (settingsIcon) {
            settingsIcon.removeEventListener('click', this.handleSettingsClick);
        }

        const closeButton = document.getElementById('close-settings');
        if (closeButton) {
            closeButton.removeEventListener('click', this.closeSettings);
        }

        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.removeEventListener('click', this.closeSettings);
        }

        // Очистка остальных компонентов
        if (this.scene3DManager) {
            this.scene3DManager.cleanup();
        }
        if (this.longPressManager) {
            this.longPressManager.cleanup();
        }
        if (this.hiddenMenuButtons) {
            this.hiddenMenuButtons.remove();
        }
    }

    // Добавляем класс main-ui ко всем элементам интерфейса, кроме контейнера аватара
    addMainUIClass() {
        // Находим все контейнеры и элементы интерфейса, которые нужно скрывать
        const uiContainers = [
            'header', 'footer', 'nav', '.user-info', '.profile-section',
            '.menu-section', '.buttons-container', '.stats-container'
        ];

        uiContainers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.id !== 'avatar-3d-container' && !el.closest('#avatar-3d-container')) {
                    el.classList.add('main-ui');
                }
            });
        });
    }

    // Добавляем дополнительные стили для мобильных устройств
    addMobileStyles() {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @media (max-width: 768px) {
                .hidden-menu-button {
                    width: 50px !important;
                    height: 50px !important;
                }
                
                #hidden-menu-buttons {
                    padding: 10px !important;
                }
                
                .hidden-menu-side.left {
                    margin-right: 10px;
                }
                
                .hidden-menu-side.right {
                    margin-left: 10px;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

// Экспортируем класс глобально
window.MainPage = MainPage;