// ============================================
// MAIN.JS - Game Entry Point
// ============================================

// Three.js globals
let scene, renderer, clock;
window.playerTank = null;
window.playerBarrel = null; // Reference to barrel for aim
window.renderer = null;

// Initialize the game
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a05);
    scene.fog = new THREE.FogExp2(0x1a0a05, 0.003);

    // Camera
    CameraSystem.init();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);
    window.renderer = renderer;

    // Clock
    clock = new THREE.Clock();

    // Lighting
    setupLighting();

    // Create terrain
    Terrain.create(scene);

    // Create sky
    createSky();

    // Create player tank
    createPlayerTank();

    // Initialize systems
    WeaponSystem.init(scene);
    Enemies.init(scene);
    UI.init();
    Controls.init();
    TurnSystem.init();

    // Spawn initial enemies
    Enemies.spawn(CONFIG.STARTING_ENEMIES);

    // Generate initial wind
    TurnSystem.generateWind();

    // Start button
    document.getElementById('start-button').addEventListener('click', startGame);

    // Shop close button
    document.getElementById('shop-close').addEventListener('click', () => Shop.close());

    // Update displays
    UI.updateWeaponDisplay();
    UI.updateCredits();

    // Start animation loop
    animate();
}

// Setup lighting
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffaa55, 1.5);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.4);
    scene.add(hemiLight);
}

// Create sky
function createSky() {
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0a0a15) },
            bottomColor: { value: new THREE.Color(0x3d1a0a) },
            offset: { value: 20 },
            exponent: { value: 0.6 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Stars
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 1000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.5;
        const r = 380;
        starPositions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi) + 50,
            r * Math.sin(phi) * Math.sin(theta)
        );
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Create player tank
function createPlayerTank() {
    window.playerTank = new THREE.Group();

    // Tank body
    const bodyGeometry = new THREE.BoxGeometry(4, 2, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a5a2a,
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    window.playerTank.add(body);

    // Turret
    const turretGeometry = new THREE.CylinderGeometry(1.5, 1.8, 1.2, 8);
    const turret = new THREE.Mesh(turretGeometry, bodyMaterial);
    turret.position.y = 1.2;
    turret.castShadow = true;
    window.playerTank.add(turret);

    // Barrel - rotated to point FORWARD (-Z in local space, which is forward when tank yaw is 0)
    const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.5
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = -Math.PI / 2; // Point forward (negative Z)
    barrel.position.set(0, 2.2, -1.5); // Position in front of turret
    barrel.castShadow = true;
    window.playerTank.add(barrel);
    window.playerBarrel = barrel; // Store reference for aiming

    // Tracks
    const trackGeometry = new THREE.BoxGeometry(1, 1.5, 6.5);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    leftTrack.position.set(-2.2, -0.5, 0);
    window.playerTank.add(leftTrack);
    const rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
    rightTrack.position.set(2.2, -0.5, 0);
    window.playerTank.add(rightTrack);

    window.playerTank.position.set(0, 2, 0);
    scene.add(window.playerTank);
}

// Start game
function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    GameState.started = true;

    if (!GameState.isMobile) {
        document.body.requestPointerLock();
    }
}

// Update player movement - FIXED to use tank direction, not camera
function updatePlayerMovement(delta) {
    if (!GameState.started) return;
    if (!GameState.isMobile && !document.pointerLockElement) return;

    const speed = CONFIG.PLAYER_SPEED;
    const velocity = new THREE.Vector3();

    // Use TANK direction for movement (not camera!)
    const forward = CameraSystem.getTankForwardDirection();
    const right = CameraSystem.getTankRightDirection();

    // Keyboard input
    if (Controls.keys.moveForward) velocity.add(forward);
    if (Controls.keys.moveBackward) velocity.sub(forward);
    if (Controls.keys.moveRight) velocity.add(right);
    if (Controls.keys.moveLeft) velocity.sub(right);

    // Mobile joystick
    if (GameState.isMobile && Controls.mobile.joystick.active) {
        const mobileInput = Controls.getMobileInput();
        velocity.add(forward.clone().multiplyScalar(-mobileInput.z));
        velocity.add(right.clone().multiplyScalar(mobileInput.x));
    }

    // Only move if there's input
    if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(speed * delta);

        // Update tank position
        const tankPos = window.playerTank.position.clone().add(velocity);

        // Keep within bounds
        const halfTerrain = CONFIG.TERRAIN_SIZE / 2 - 10;
        tankPos.x = Math.max(-halfTerrain, Math.min(halfTerrain, tankPos.x));
        tankPos.z = Math.max(-halfTerrain, Math.min(halfTerrain, tankPos.z));

        // Follow terrain
        const terrainY = Terrain.getHeight(tankPos.x, tankPos.z);
        tankPos.y = terrainY + 2;

        window.playerTank.position.copy(tankPos);
    }

    // Update tank visual rotation to match aim (yaw only)
    window.playerTank.rotation.y = CameraSystem.getHorizontalRotation();

    // Update barrel pitch to match aim elevation
    if (window.playerBarrel) {
        // Barrel rotation: -PI/2 is horizontal forward, add pitch for up/down aim
        window.playerBarrel.rotation.x = Math.PI / 2 + CameraSystem.tankPitch;
    }

    // In first person, sync camera position to tank
    if (CameraSystem.currentMode === CONFIG.CAMERA_MODES.FIRST_PERSON) {
        const camPos = window.playerTank.position.clone();
        camPos.y += 3; // Eye height above tank
        CameraSystem.camera.position.copy(camPos);
    }
}

// Update power charge
function updatePowerCharge(delta) {
    if (GameState.charging) {
        GameState.power += delta * 50;
        if (GameState.power > 100) GameState.power = 100;
        UI.updatePower();
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (GameState.started) {
        updatePlayerMovement(delta);
        updatePowerCharge(delta);

        // Update camera (for third person modes)
        CameraSystem.update(window.playerTank.position, window.playerTank.rotation.y, delta);

        // Update systems
        WeaponSystem.updateProjectiles(delta);
        WeaponSystem.updateExplosions(delta);
        WeaponSystem.updateImpactSmoke(delta);
        Enemies.update(delta);
        TurnSystem.update(delta);

        // Update UI
        UI.updateMinimap();
        UI.updateTurnIndicator();
    }

    renderer.render(scene, CameraSystem.camera);
}

// Initialize on load
init();
