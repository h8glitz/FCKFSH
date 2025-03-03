// static/js/pages/avatarViewer.js

// Объявляем класс в глобальной области видимости
class AvatarViewer {
    constructor(containerId) {
        console.log('AvatarViewer: Initializing with container:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('AvatarViewer: Container not found:', containerId);
            return;
        }

        try {
            // Проверяем доступность THREE
            if (!window.THREE) {
                throw new Error('THREE is not loaded');
            }

            this.scene = new THREE.Scene();
            console.log('AvatarViewer: Scene created');

            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            console.log('AvatarViewer: Camera created');

            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            console.log('AvatarViewer: Renderer created');

            this.init();
        } catch (error) {
            console.error('AvatarViewer: Error in constructor:', error);
        }
    }

    init() {
        try {
            console.log('AvatarViewer: Starting initialization');

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0xe1e1e1, 1);
            this.container.appendChild(this.renderer.domElement);
            console.log('AvatarViewer: Renderer initialized');

            this.camera.position.z = 2;
            this.camera.position.y = 1;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(ambientLight);
            console.log('AvatarViewer: Ambient light added');

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 1, 1);
            this.scene.add(directionalLight);
            console.log('AvatarViewer: Directional light added');

            // Проверяем доступность OrbitControls
            if (!window.OrbitControls) {
                throw new Error('OrbitControls is not loaded');
            }

            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 5;
            this.controls.enablePan = false;
            console.log('AvatarViewer: Controls initialized');

            this.loadAvatar();

            window.addEventListener('resize', () => this.onWindowResize());
            console.log('AvatarViewer: Resize listener added');

            this.animate();
            console.log('AvatarViewer: Animation started');
        } catch (error) {
            console.error('AvatarViewer: Error in init:', error);
        }
    }

    loadAvatar() {
        try {
            // Проверяем доступность GLTFLoader
            if (!window.GLTFLoader) {
                throw new Error('GLTFLoader is not loaded');
            }

            const loader = new GLTFLoader();
            const modelPath = '/static/models/avatars/avatar.glb';
            console.log('AvatarViewer: Loading avatar from:', modelPath);

            loader.load(
                modelPath,
                (gltf) => {
                    console.log('AvatarViewer: GLTF loaded successfully:', gltf);
                    this.avatar = gltf.scene;
                    const box = new THREE.Box3().setFromObject(this.avatar);
                    const center = box.getCenter(new THREE.Vector3());
                    this.avatar.position.sub(center);
                    this.scene.add(this.avatar);
                    this.avatar.rotation.y = Math.PI;
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100).toFixed(2);
                    console.log(`AvatarViewer: Loading progress: ${percent}%`);
                },
                (error) => {
                    console.error('AvatarViewer: Error loading avatar:', error);
                }
            );
        } catch (error) {
            console.error('AvatarViewer: Error in loadAvatar:', error);
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.avatar) {
            this.avatar.rotation.y += 0.005; // Медленное вращение
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Делаем класс доступным глобально
window.AvatarViewer = AvatarViewer;