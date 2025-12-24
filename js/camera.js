// ============================================
// CAMERA.JS - Camera System with Multiple Viewpoints
// ============================================

const CameraSystem = {
    camera: null,
    currentMode: CONFIG.CAMERA_MODES.FIRST_PERSON,
    targetPosition: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),

    // Tank orientation (separate from camera)
    tankYaw: 0,
    tankPitch: 0,

    // For guided missile following
    followingMissile: false,

    // Initialize camera
    init() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 0);
        return this.camera;
    },

    // Cycle through camera modes
    cycleMode() {
        this.currentMode = (this.currentMode + 1) % 3;
        GameState.cameraMode = this.currentMode;

        const modeNames = ['FIRST PERSON', 'THIRD PERSON', 'DRONE VIEW'];
        UI.showMessage(modeNames[this.currentMode]);

        // Update FOV
        const configs = [
            CONFIG.CAMERA_POSITIONS.FIRST_PERSON,
            CONFIG.CAMERA_POSITIONS.THIRD_PERSON_CLOSE,
            CONFIG.CAMERA_POSITIONS.THIRD_PERSON_FAR
        ];
        this.camera.fov = configs[this.currentMode].fov;
        this.camera.updateProjectionMatrix();
    },

    // Update camera based on mode and tank position
    update(tankPosition, tankRotation, delta) {
        if (this.followingMissile && GameState.guidedMissile) {
            this.followMissile(GameState.guidedMissile, delta);
            return;
        }

        const configs = [
            CONFIG.CAMERA_POSITIONS.FIRST_PERSON,
            CONFIG.CAMERA_POSITIONS.THIRD_PERSON_CLOSE,
            CONFIG.CAMERA_POSITIONS.THIRD_PERSON_FAR
        ];
        const config = configs[this.currentMode];

        if (this.currentMode === CONFIG.CAMERA_MODES.FIRST_PERSON) {
            // First person - camera directly controlled by mouse, tank follows
            // Position is set by movement system
        }
        else if (this.currentMode === CONFIG.CAMERA_MODES.THIRD_PERSON_CLOSE) {
            // Third person close - behind and above tank
            const offset = new THREE.Vector3(0, config.height, config.distance);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.tankYaw);

            this.targetPosition.copy(tankPosition).add(offset);
            this.camera.position.lerp(this.targetPosition, delta * 8);

            // Look at tank
            this.targetLookAt.copy(tankPosition);
            this.targetLookAt.y += 3;
            this.camera.lookAt(this.targetLookAt);
        }
        else if (this.currentMode === CONFIG.CAMERA_MODES.THIRD_PERSON_FAR) {
            // Drone view - high above, looking down
            this.targetPosition.set(
                tankPosition.x,
                tankPosition.y + config.height,
                tankPosition.z + 30
            );
            this.camera.position.lerp(this.targetPosition, delta * 5);

            // Look down at tank
            this.targetLookAt.copy(tankPosition);
            this.camera.lookAt(this.targetLookAt);
        }
    },

    // Follow guided missile
    followMissile(missile, delta) {
        const missileDir = missile.userData.velocity.clone().normalize();

        // Position camera behind missile
        const camPos = missile.position.clone().sub(missileDir.clone().multiplyScalar(15));
        camPos.y += 5;

        this.camera.position.lerp(camPos, delta * 10);
        this.camera.lookAt(missile.position);
    },

    // Handle mouse movement - controls tank aiming
    handleMouseMove(movementX, movementY, sensitivity = 0.002) {
        if (this.followingMissile) return null;

        // Update tank yaw and pitch (aiming direction)
        this.tankYaw -= movementX * sensitivity;
        this.tankPitch -= movementY * sensitivity;
        this.tankPitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.tankPitch));

        // In first person, camera follows the aim directly
        if (this.currentMode === CONFIG.CAMERA_MODES.FIRST_PERSON) {
            this.euler.set(this.tankPitch, this.tankYaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(this.euler);
        }

        return { x: this.tankPitch, y: this.tankYaw };
    },

    // Get the TANK's forward direction (for movement)
    getTankForwardDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.tankYaw);
        return direction;
    },

    // Get the TANK's right direction (for movement)
    getTankRightDirection() {
        const direction = new THREE.Vector3(1, 0, 0);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.tankYaw);
        return direction;
    },

    // Get the firing direction (based on aim)
    getFireDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.tankPitch);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.tankYaw);
        return direction;
    },

    // Get horizontal rotation for tank visual
    getHorizontalRotation() {
        return this.tankYaw;
    },

    // Handle window resize
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
};
