// ============================================
// CONTROLS.JS - Input Handling
// ============================================

const Controls = {
    // Keyboard state
    keys: {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false
    },

    // Mobile control state
    mobile: {
        joystick: {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            touchId: null
        },
        aim: {
            active: false,
            lastX: 0,
            lastY: 0,
            touchId: null
        },
        fire: {
            active: false,
            touchId: null
        }
    },

    // Initialize controls
    init() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Window resize
        window.addEventListener('resize', () => this.onResize());

        // Detect mobile
        this.detectMobile();

        // Mobile controls
        if (GameState.isMobile) {
            this.setupMobileControls();
        }
    },

    detectMobile() {
        GameState.isMobile = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.innerWidth <= 768);

        if (GameState.isMobile) {
            document.body.classList.add('mobile-active');
        }
    },

    // Keyboard handlers
    onKeyDown(event) {
        if (!GameState.started) return;

        switch (event.code) {
            case 'KeyW': this.keys.moveForward = true; break;
            case 'KeyS': this.keys.moveBackward = true; break;
            case 'KeyA': this.keys.moveLeft = true; break;
            case 'KeyD': this.keys.moveRight = true; break;
            case 'KeyV': CameraSystem.cycleMode(); break;
            case 'Digit1': WeaponSystem.select(0); break;
            case 'Digit2': WeaponSystem.select(1); break;
            case 'Digit3': WeaponSystem.select(2); break;
            case 'Digit4': WeaponSystem.select(3); break;
            case 'Digit5': WeaponSystem.select(4); break;
            case 'Digit6': WeaponSystem.select(5); break;
            case 'Digit7': WeaponSystem.select(6); break;
            case 'Digit8': WeaponSystem.select(7); break;
            case 'Digit9': WeaponSystem.select(8); break;
            case 'Digit0': WeaponSystem.select(9); break;
            case 'Minus': WeaponSystem.select(10); break;
        }
    },

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.keys.moveForward = false; break;
            case 'KeyS': this.keys.moveBackward = false; break;
            case 'KeyA': this.keys.moveLeft = false; break;
            case 'KeyD': this.keys.moveRight = false; break;
        }
    },

    // Mouse handlers
    onMouseMove(event) {
        if (!GameState.started) return;
        if (GameState.isMobile) return;
        if (!document.pointerLockElement) return;

        const euler = CameraSystem.handleMouseMove(event.movementX, event.movementY);
        if (euler) {
            UI.updateAngle(euler);
            // Update tank rotation
            if (window.playerTank) {
                window.playerTank.rotation.y = euler.y;
            }
        }
    },

    onMouseDown(event) {
        if (!GameState.started) return;

        if (event.button === 0) {
            // Check for air strike targeting
            if (GameState.isTargetingAirStrike) {
                this.confirmAirStrike(event);
                return;
            }

            // Desktop pointer lock
            if (!GameState.isMobile && !document.pointerLockElement) {
                document.body.requestPointerLock();
                return;
            }

            if (TurnSystem.canPlayerFire()) {
                GameState.charging = true;
            }
        }
    },

    onMouseUp(event) {
        if (!GameState.started || event.button !== 0) return;

        if (GameState.charging && TurnSystem.canPlayerFire()) {
            this.fireWeapon();
        }
        GameState.charging = false;
    },

    // Fire the weapon
    fireWeapon() {
        const direction = CameraSystem.getFireDirection();
        // Start position from tank barrel
        const startPos = window.playerTank.position.clone();
        startPos.y += 4; // Barrel height

        if (WeaponSystem.fire(startPos, direction, GameState.power)) {
            TurnSystem.playerFired();
            GameState.canFire = false;
            GameState.power = 50;
            UI.updatePower();
        }
    },

    // Confirm air strike target
    confirmAirStrike(event) {
        // Raycast to find ground position
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(mouse, CameraSystem.camera);

        const intersects = raycaster.intersectObject(Terrain.mesh);
        if (intersects.length > 0) {
            WeaponSystem.confirmAirStrike(intersects[0].point);
            TurnSystem.playerFired();
        }
    },

    // Window resize
    onResize() {
        CameraSystem.onResize();
        if (window.renderer) {
            window.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    },

    // Setup mobile controls
    setupMobileControls() {
        const joystickZone = document.getElementById('joystick-zone');
        const aimZone = document.getElementById('aim-zone');
        const fireZone = document.getElementById('fire-zone');
        const weaponButtons = document.querySelectorAll('.weapon-btn');

        // Joystick
        joystickZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        joystickZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        joystickZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });

        // Aim
        aimZone.addEventListener('touchstart', (e) => this.onAimStart(e), { passive: false });
        aimZone.addEventListener('touchmove', (e) => this.onAimMove(e), { passive: false });
        aimZone.addEventListener('touchend', (e) => this.onAimEnd(e), { passive: false });

        // Fire
        fireZone.addEventListener('touchstart', (e) => this.onFireStart(e), { passive: false });
        fireZone.addEventListener('touchend', (e) => this.onFireEnd(e), { passive: false });

        // Weapon buttons
        weaponButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const weaponIndex = parseInt(btn.dataset.weapon);
                WeaponSystem.select(weaponIndex);
            }, { passive: false });
        });

        // Prevent default touch
        document.addEventListener('touchmove', (e) => {
            if (GameState.started) e.preventDefault();
        }, { passive: false });
    },

    // Mobile joystick handlers
    onJoystickStart(e) {
        e.preventDefault();
        if (!GameState.started) return;

        const touch = e.changedTouches[0];
        this.mobile.joystick.active = true;
        this.mobile.joystick.touchId = touch.identifier;

        const rect = e.currentTarget.getBoundingClientRect();
        this.mobile.joystick.startX = rect.left + rect.width / 2;
        this.mobile.joystick.startY = rect.top + rect.height / 2;
    },

    onJoystickMove(e) {
        e.preventDefault();
        if (!this.mobile.joystick.active) return;

        const touch = Array.from(e.changedTouches).find(
            t => t.identifier === this.mobile.joystick.touchId
        );
        if (!touch) return;

        const deltaX = touch.clientX - this.mobile.joystick.startX;
        const deltaY = touch.clientY - this.mobile.joystick.startY;

        const maxRadius = 50;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const clampedDistance = Math.min(distance, maxRadius);
        const angle = Math.atan2(deltaY, deltaX);

        this.mobile.joystick.currentX = Math.cos(angle) * clampedDistance / maxRadius;
        this.mobile.joystick.currentY = Math.sin(angle) * clampedDistance / maxRadius;

        // Update visual
        const stick = document.getElementById('joystick-stick');
        const visualX = Math.cos(angle) * clampedDistance;
        const visualY = Math.sin(angle) * clampedDistance;
        stick.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    },

    onJoystickEnd(e) {
        e.preventDefault();
        this.mobile.joystick.active = false;
        this.mobile.joystick.currentX = 0;
        this.mobile.joystick.currentY = 0;

        const stick = document.getElementById('joystick-stick');
        stick.style.transform = 'translate(-50%, -50%)';
    },

    // Mobile aim handlers
    onAimStart(e) {
        e.preventDefault();
        if (!GameState.started) return;

        const touch = e.changedTouches[0];
        this.mobile.aim.active = true;
        this.mobile.aim.touchId = touch.identifier;
        this.mobile.aim.lastX = touch.clientX;
        this.mobile.aim.lastY = touch.clientY;
    },

    onAimMove(e) {
        e.preventDefault();
        if (!this.mobile.aim.active) return;

        const touch = Array.from(e.changedTouches).find(
            t => t.identifier === this.mobile.aim.touchId
        );
        if (!touch) return;

        const deltaX = touch.clientX - this.mobile.aim.lastX;
        const deltaY = touch.clientY - this.mobile.aim.lastY;

        this.mobile.aim.lastX = touch.clientX;
        this.mobile.aim.lastY = touch.clientY;

        const euler = CameraSystem.handleMouseMove(deltaX, deltaY, 0.004);
        if (euler) {
            UI.updateAngle(euler);
            if (window.playerTank) {
                window.playerTank.rotation.y = euler.y;
            }
        }
    },

    onAimEnd(e) {
        e.preventDefault();
        this.mobile.aim.active = false;
    },

    // Mobile fire handlers
    onFireStart(e) {
        e.preventDefault();
        if (!GameState.started || !TurnSystem.canPlayerFire()) return;

        this.mobile.fire.active = true;
        GameState.charging = true;
        document.getElementById('fire-button').classList.add('charging');
    },

    onFireEnd(e) {
        e.preventDefault();

        if (this.mobile.fire.active && GameState.charging && TurnSystem.canPlayerFire()) {
            this.fireWeapon();
        }

        this.mobile.fire.active = false;
        GameState.charging = false;
        document.getElementById('fire-button').classList.remove('charging');
    },

    // Get mobile movement input
    getMobileInput() {
        if (!GameState.isMobile || !this.mobile.joystick.active) {
            return { x: 0, z: 0 };
        }
        return {
            x: this.mobile.joystick.currentX,
            z: this.mobile.joystick.currentY
        };
    }
};
