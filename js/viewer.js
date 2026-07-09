/**
 * BRASLAER SHOWROOM V2
 * VIEWER 3D COM THREE.JS
 * @version 2.0.0
 */

class Viewer3D {
    constructor(config = {}) {
        this.config = {
            container: config.container || '#viewer3D',
            loaderContainer: config.loaderContainer || '#viewerLoader',
            backgroundColor: config.backgroundColor || 0xffffff,
            enableAutoRotate: config.enableAutoRotate !== false,
            cameraDistance: config.cameraDistance || 4,
            floorColor: config.floorColor || 0xcccccc,
            ...config
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.controls = null;
        this.isAutoRotating = this.config.enableAutoRotate;
        this.isFullscreen = false;

        this.init();
    }

    /**
     * Inicializar Three.js
     */
    init() {
        const container = document.querySelector(this.config.container);
        if (!container) {
            console.error(`Container not found: ${this.config.container}`);
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(2, 2, 4);

        // Renderer - Melhorias de qualidade
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            precision: 'highp',
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.renderer.shadowMap.resolution = 4096;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        
        container.appendChild(this.renderer.domElement);

        // Lights
        this.setupLights();

        // Floor
        this.createInfiniteFloor();

        // Controls
        this.setupControls();

        // Event listeners
        this.attachEventListeners();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.animate();
    }

    /**
     * Configurar iluminação profissional
     */
    setupLights() {
        // Luz ambiente neutra
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        // Luz direcional principal (suave)
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(8, 12, 8);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 4096;
        directionalLight1.shadow.mapSize.height = 4096;
        directionalLight1.shadow.camera.far = 50;
        directionalLight1.shadow.camera.left = -30;
        directionalLight1.shadow.camera.right = 30;
        directionalLight1.shadow.camera.top = 30;
        directionalLight1.shadow.camera.bottom = -30;
        directionalLight1.shadow.bias = -0.0005;
        directionalLight1.shadow.normalBias = 0.05;
        this.scene.add(directionalLight1);

        // Luz preenchimento frontal
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-8, 5, -8);
        this.scene.add(directionalLight2);

        // Luz de fundo sutil
        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight3.position.set(0, -5, -10);
        this.scene.add(directionalLight3);
    }

    /**
     * Criar piso infinito com reflexo
     */
    createInfiniteFloor() {
        // Criar textura de grid para o piso
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fundo cinza claro
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 2;
        const gridSize = 32;

        for (let i = 0; i <= canvas.width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }

        for (let i = 0; i <= canvas.height; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.repeat.set(4, 4);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Material do piso com reflexo sutil
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.6,
            metalness: 0.1,
            side: THREE.FrontSide,
            color: this.config.floorColor
        });

        // Criar piso grande (infinito) - posicionado abaixo
        const floorGeometry = new THREE.PlaneGeometry(200, 200);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5; // Piso bem embaixo para não cortar a máquina
        floor.receiveShadow = true;
        floor.castShadow = false;

        this.scene.add(floor);

        // Adicionar grade de referência visual sutil
        this.addGridHelper();
    }

    /**
     * Adicionar grade de referência (opcional)
     */
    addGridHelper() {
        const gridHelper = new THREE.GridHelper(100, 20, 0xcccccc, 0xeeeeee);
        gridHelper.position.y = -4.95; // Mesma altura do piso
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        this.scene.add(gridHelper);
    }

    /**
     * Configurar controles
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.autoRotate = this.isAutoRotating;
        this.controls.autoRotateSpeed = 4;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 20;
        this.controls.enablePan = true;
    }

    /**
     * Carregar modelo GLB
     */
    async loadModel(url, options = {}) {
        try {
            this.showLoader();

            const loader = new THREE.GLTFLoader();
            
            return new Promise((resolve, reject) => {
                loader.load(
                    url,
                    (gltf) => {
                        // Remover modelo anterior
                        if (this.model) {
                            this.scene.remove(this.model);
                        }

                        this.model = gltf.scene;

                        // Aplicar escala
                        if (options.scale) {
                            this.model.scale.set(options.scale, options.scale, options.scale);
                        }

                        // Aplicar rotação inicial
                        if (options.rotation) {
                            this.model.rotation.set(
                                options.rotation.x || 0,
                                options.rotation.y || 0,
                                options.rotation.z || 0
                            );
                        }

                        // Processar materiais e texturas
                        this.model.traverse((node) => {
                            if (node.isMesh) {
                                node.castShadow = true;
                                node.receiveShadow = true;
                                node.frustumCulled = false;
                                
                                // Melhorar material
                                if (node.material) {
                                    node.material.side = THREE.FrontSide;
                                    
                                    // Ativar mapeamento de tonalidade
                                    if (node.material.map) {
                                        node.material.map.colorSpace = THREE.SRGBColorSpace;
                                    }

                                    // Ajustar normal map se existir
                                    if (node.material.normalMap) {
                                        node.material.normalScale.set(0.8, 0.8);
                                    }

                                    // Renderizar ambos os lados se necessário
                                    node.material.side = THREE.DoubleSide;
                                    
                                    // Melhorar qualidade do material
                                    node.material.precision = 'highp';
                                }
                            }
                        });

                        // Adicionar à cena
                        this.scene.add(this.model);

                        // Ajustar câmera
                        this.fitCameraToObject();

                        // Aplicar posição da câmera customizada
                        if (options.camera) {
                            this.camera.position.set(
                                options.camera.x || 2,
                                options.camera.y || 2,
                                options.camera.z || 4
                            );
                        }

                        this.hideLoader();
                        resolve(this.model);
                    },
                    (progress) => {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        this.updateLoaderProgress(percentComplete);
                    },
                    (error) => {
                        console.error('Erro ao carregar modelo:', error);
                        this.hideLoader();
                        this.showError('Erro ao carregar o modelo 3D');
                        reject(error);
                    }
                );
            });
        } catch (error) {
            this.hideLoader();
            this.showError('Erro ao carregar o modelo 3D');
            console.error(error);
        }
    }

    /**
     * Ajustar câmera ao objeto
     */
    fitCameraToObject() {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;

        this.camera.position.z = cameraZ;
        this.camera.lookAt(this.model.position);
        this.controls.target.copy(box.getCenter(new THREE.Vector3()));
        this.controls.update();
    }

    /**
     * Resetar câmera
     */
    resetCamera() {
        if (!this.model) return;
        this.fitCameraToObject();
        this.controls.reset();
    }

    /**
     * Toggle auto rotação
     */
    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        this.controls.autoRotate = this.isAutoRotating;
        return this.isAutoRotating;
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
        this.controls.update();
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
        this.controls.update();
    }

    /**
     * Tela cheia
     */
    toggleFullscreen() {
        const container = this.renderer.domElement.parentElement;
        
        if (!this.isFullscreen) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            }
            this.isFullscreen = true;
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            this.isFullscreen = false;
        }

        setTimeout(() => this.onWindowResize(), 100);
    }

    /**
     * Anexar event listeners
     */
    attachEventListeners() {
        const resetBtn = document.getElementById('resetCamera');
        const rotateBtn = document.getElementById('toggleRotate');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const fullscreenBtn = document.getElementById('fullscreenViewer');

        if (resetBtn) resetBtn.addEventListener('click', () => this.resetCamera());
        if (rotateBtn) rotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') this.resetCamera();
            if (e.key === ' ') {
                e.preventDefault();
                this.toggleAutoRotate();
            }
            if (e.key === '+' || e.key === '=') this.zoomIn();
            if (e.key === '-' || e.key === '_') this.zoomOut();
        });
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Loop de animação
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Mostrar loader
     */
    showLoader() {
        const loader = document.querySelector(this.config.loaderContainer);
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    /**
     * Esconder loader
     */
    hideLoader() {
        const loader = document.querySelector(this.config.loaderContainer);
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * Atualizar progresso do loader
     */
    updateLoaderProgress(percent) {
        const loader = document.querySelector(this.config.loaderContainer);
        if (loader) {
            const span = loader.querySelector('span');
            if (span) {
                span.textContent = `Carregando modelo... ${Math.round(percent)}%`;
            }
        }
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        const loader = document.querySelector(this.config.loaderContainer);
        if (loader) {
            loader.innerHTML = `<div style="color: #d32f2f; font-weight: 700;">${message}</div>`;
            setTimeout(() => {
                loader.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Destruir viewer
     */
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        if (this.controls) {
            this.controls.dispose();
        }
    }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Viewer3D;
}
