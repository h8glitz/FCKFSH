// Основной файл main.js, использующий Babylon.js через CDN
// Библиотеки загружаются через тег <script> в HTML

// Константы
const CONSTANTS = {
    LIGHTED_STAGE_PATH: '/static/models/avatars/scene.glb',
    CAMERA: {
        FOV: 45 * (Math.PI / 180), // Уменьшаем угол обзора для лучшей перспективы
        NEAR: 0.1,
        FAR: 1000,
        INITIAL_POSITION: new BABYLON.Vector3(0, 0.5, 5), // Опускаем камеру ниже
        TARGET: new BABYLON.Vector3(0, 0.5, 0) // Опускаем точку фокусировки
    },
    CONTROLS: {
        MIN_POLAR_ANGLE: Math.PI * 0.1, // Уменьшаем минимальный угол для лучшего обзора снизу
        MAX_POLAR_ANGLE: Math.PI * 0.75,
        MIN_AZIMUTH_ANGLE: -Math.PI / 2,
        MAX_AZIMUTH_ANGLE: Math.PI / 2,
        MIN_DISTANCE: 5,
        MAX_DISTANCE: 10,
        ENABLE_PAN: false,
        ENABLE_ZOOM: false,
        ENABLE_DAMPING: true,
        DAMPING_FACTOR: 0.05
    },
    LONG_PRESS_DURATION: 2000
};

// Базовый класс для работы с DOM
class DOMUtils {
    static waitForElement(selector) {
        return new Promise(resolve => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);
            
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

    static createButton(id, text, icon, onClick) {
            const button = document.createElement('button');
        button.id = id;
        button.className = 'menu-button';
        button.innerHTML = icon;
        button.style.cssText = `
            width: 60px;
            height: 60px;
            padding: 10px;
            background-color: #000000;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            transition: transform 0.2s ease-in-out;
        `;
        
        button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.1)');
        button.addEventListener('mouseleave', () => button.style.transform = 'scale(1)');
        button.addEventListener('click', onClick);
        
        return button;
    }
}

// Объединенный класс для управления 3D сценой и освещением
class SceneManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.avatar = null;
        this.lightedStage = null;
        this.sceneLights = [];
        this.clothingGroups = {};

        this.init();
    }

    init() {
        this.initEngine();
        this.initScene();
        this.initCamera();
        this.initLights();
        this.initEventListeners();

        // Запускаем рендер-цикл
        this.startRenderLoop();
    }

    initEngine() {
        const canvas = document.createElement('canvas');
        canvas.id = 'renderCanvas';
        canvas.style.cssText = `
            width: 100%;
            height: 100%;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 0;
        `;
        document.getElementById(this.containerId).appendChild(canvas);
        
        // Настройки как в песочнице Babylon.js
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            adaptToDeviceRatio: true,
            powerPreference: "high-performance"
        });
        
        // Устанавливаем масштабирование
        this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    }

    initScene() {
        console.log("Начало инициализации сцены");
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        this.scene.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        console.log("Проверка файла окружения...");
        const envPath = "static/textures/studio.env";
        
        // Проверяем содержимое файла
        fetch(envPath)
            .then(response => {
                console.log("Статус ответа:", response.status);
                console.log("Тип контента:", response.headers.get('content-type'));
                return response.text();
            })
            .then(text => {
                console.log("Первые 100 символов файла:", text.substring(0, 100));
                // Проверяем, является ли файл HDR
                const isHDR = text.startsWith('#?RADIANCE') || text.startsWith('#?RGBE');
                console.log("Это HDR файл:", isHDR);
                
                if (isHDR) {
                    this.loadEnvironment(envPath);
                } else {
                    console.error("Файл не является HDR окружением");
                    this.loadDefaultEnvironment();
                }
            })
            .catch(error => {
                console.error("Ошибка при проверке файла:", error);
                this.loadDefaultEnvironment();
            });
    }

    loadEnvironment(path) {
        console.log("Загрузка окружения из:", path);
        try {
            const hdrTexture = new BABYLON.CubeTexture(path, this.scene, {
                noMipmap: false,
                gammaSpace: false,
                createPolynomials: true,
                lodScale: 0.8,
                lodOffset: 0
            });
            
            hdrTexture.name = "studio";
            
            hdrTexture.onLoad = () => {
                console.log("HDR окружение успешно загружено");
                this.scene.environmentTexture = hdrTexture;
                this.scene.environmentIntensity = 1.5;
                this.scene.createDefaultSkybox(hdrTexture, true, 1000);
            };
            
            hdrTexture.onError = (error) => {
                console.error("Ошибка загрузки HDR окружения:", error);
                this.loadDefaultEnvironment();
            };
        } catch (error) {
            console.error("Ошибка при создании текстуры:", error);
            this.loadDefaultEnvironment();
        }
    }

    loadDefaultEnvironment() {
        console.log("Загрузка дефолтного окружения...");
        const defaultEnv = BABYLON.CubeTexture.CreateFromPrefilteredData(
            "https://playground.babylonjs.com/textures/environment.env", 
            this.scene
        );
        this.scene.environmentTexture = defaultEnv;
        this.scene.environmentIntensity = 1.5;
        this.scene.createDefaultSkybox(defaultEnv, true, 1000);
    }

    initCamera() {
        this.camera = new BABYLON.ArcRotateCamera(
            "arcCamera",
            1.557178034893978, // alpha
            1.4445513504351646, // beta
            3.8439755327644662, // radius
            new BABYLON.Vector3(0, 0.5, 0),
            this.scene
        );
        
        // Устанавливаем точную позицию
        this.camera.setPosition(new BABYLON.Vector3(
            0.05193017058563931,
            0.9839945714163982,
            3.813030344583461
        ));
        
        // Ограничения камеры
        this.camera.lowerRadiusLimit = 2;
        this.camera.upperRadiusLimit = 6;
        
        this.camera.lowerBetaLimit = Math.PI * 0.25;
        this.camera.upperBetaLimit = Math.PI * 0.75;
        
        this.camera.wheelPrecision = 50;
        this.camera.pinchPrecision = 50;
        
        // Включаем управление камерой
        this.camera.attachControl(this.engine.getRenderingCanvas(), true);
    }

    initLights() {
        // Создаем общий свет (аналог THREE.js AmbientLight)
        this.ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.1;
        this.ambientLight.diffuse = new BABYLON.Color3(1, 1, 1);
        this.ambientLight.specular = new BABYLON.Color3(1, 1, 1);
        this.ambientLight.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Добавляем управление стрелками
        window.addEventListener('keydown', (e) => {
            const speed = 0.1;
            switch(e.key) {
                case 'ArrowUp':
                    this.camera.alpha += speed;
                    break;
                case 'ArrowDown':
                    this.camera.alpha -= speed;
                    break;
                case 'ArrowLeft':
                    this.camera.beta += speed;
                    break;
                case 'ArrowRight':
                    this.camera.beta -= speed;
                    break;
            }
            // Логируем координаты камеры
            console.log('Camera position:', this.camera.position);
            console.log('Camera rotation:', {
                alpha: this.camera.alpha,
                beta: this.camera.beta,
                radius: this.camera.radius
            });
        });
    }

    onWindowResize() {
        this.engine.resize();
    }

    startRenderLoop() {
        // Создаем элемент для отображения FPS
        const fpsElement = document.createElement('div');
        fpsElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 5px 10px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;
        document.body.appendChild(fpsElement);

        let lastTime = performance.now();
        let frameCount = 0;
        let lastFpsUpdate = performance.now();

        this.engine.runRenderLoop(() => {
            this.scene.render();
            
            // Обновляем счетчик FPS каждую секунду
            frameCount++;
            const currentTime = performance.now();
            if (currentTime - lastFpsUpdate >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
                fpsElement.textContent = `FPS: ${fps}`;
                frameCount = 0;
                lastFpsUpdate = currentTime;
            }
        });
    }

    async loadModel() {
        try {
            // Добавляем базовое освещение перед загрузкой моделей
            const hdrTexture = new BABYLON.CubeTexture("https://playground.babylonjs.com/textures/environment.env", this.scene);
            this.scene.environmentTexture = hdrTexture;
            this.scene.createDefaultEnvironment({
                createGround: false,
                createSkybox: false,
                environmentTexture: hdrTexture
            });
            
            // Загружаем модель напрямую из Blender
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                CONSTANTS.LIGHTED_STAGE_PATH.substring(0, CONSTANTS.LIGHTED_STAGE_PATH.lastIndexOf('/') + 1),
                CONSTANTS.LIGHTED_STAGE_PATH.substring(CONSTANTS.LIGHTED_STAGE_PATH.lastIndexOf('/') + 1),
                this.scene
            );
            
            // Используем все как есть из Blender
            this.lightedStage = result.meshes[0];
            
            // Загружаем одежду
            await this.loadClothes();

        } catch (error) {
            console.error('Ошибка загрузки моделей:', error);
        }
    }

    async loadClothes() {
        this.clothingGroups = {
            shoes: new BABYLON.TransformNode("shoesGroup", this.scene),
            pants: new BABYLON.TransformNode("pantsGroup", this.scene),
            tops: new BABYLON.TransformNode("topsGroup", this.scene)
        };

        const clothesItems = [
            {
                path: '/static/models/clothes/pants.glb',
                name: 'pants',
                group: 'pants'
            },
            {
                path: '/static/models/clothes/sneakers.glb',
                name: 'sneakers',
                group: 'shoes'
            },
            {
                path: '/static/models/clothes/hoodie.glb',
                name: 'hoodie',
                group: 'tops'
            }
        ];

        for (const item of clothesItems) {
            try {
                const baseUrl = item.path.substring(0, item.path.lastIndexOf('/') + 1);
                const fileName = item.path.substring(item.path.lastIndexOf('/') + 1);
                
                const result = await BABYLON.SceneLoader.ImportMeshAsync(
                    "", 
                    baseUrl, 
                    fileName, 
                    this.scene
                );
                
                const clothingItem = new BABYLON.TransformNode(item.name, this.scene);
                
                // Базовая привязка к иерархии
                result.meshes.forEach((mesh, index) => {
                    if (index === 0) return;
                    mesh.parent = clothingItem;
                });
                
                clothingItem.parent = this.clothingGroups[item.group];
                
            } catch (error) {
                console.error(`Ошибка загрузки элемента одежды ${item.name}:`, error);
                continue;
            }
        }
    }
}

// Основной класс приложения
class MainPage {
    constructor() {
        this.sceneManager = new SceneManager('avatar-3d-container');
        this.uiManager = undefined; // Класс UIManager нужно будет реализовать отдельно
        this.init();
    }

    async init() {
        await this.sceneManager.loadModel();
    }
}

// Инициализация приложения
window.MainPage = MainPage;