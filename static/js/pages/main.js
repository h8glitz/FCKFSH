import * as THREE from '/static/js/libs/three.module.js';
import { GLTFLoader } from '/static/js/libs/GLTFLoader.js';
import { OrbitControls } from '/static/js/libs/OrbitControls.js';
import { DRACOLoader } from '/static/js/libs/DRACOLoader.js';

// Константы
const CONSTANTS = {
    DEFAULT_AVATAR: "/static/icons/default-avatar.png",
    AVATAR_MODEL_PATH: '/static/models/avatars/avatar.glb',
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
    }
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
        this.scene.background = new THREE.Color('#e1e1e1');
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

        return new Promise((resolve, reject) => {
            gltfLoader.load(
                CONSTANTS.AVATAR_MODEL_PATH,
                (gltf) => {
                    const avatar = gltf.scene;
                    avatar.scale.set(1, 1, 1);
                    this.scene.add(avatar);
                    resolve();
                },
                null,
                reject
            );
        });
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
}

// Основной класс приложения
class MainPage {
    constructor() {
        this.userManager = new UserManager();
        this.scene3DManager = new Scene3DManager('avatar-3d-container');
    }

    async init() {
        console.log('[MainPage] Инициализация главной страницы');
        try {
            await this.userManager.fetchUserData();
            await this.userManager.updateInterface();
            await this.scene3DManager.initialize();
        } catch (error) {
            console.error('[MainPage] Ошибка инициализации:', error);
        }
    }

    cleanup() {
        console.log('[MainPage] Очистка ресурсов');
        this.scene3DManager.cleanup();
    }
}

// Создаем экземпляр и делаем доступным глобально
const mainPage = new MainPage();
window.MainPage = {
    init: () => mainPage.init(),
    cleanup: () => mainPage.cleanup()
};

export { mainPage as default };