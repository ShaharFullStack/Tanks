// ============================================
// GAMESTATE.JS - Centralized Game State Management
// ============================================

const GameState = {
    // Core state
    started: false,
    paused: false,

    // Player stats
    score: 0,
    round: 1,
    health: 100,
    credits: CONFIG.STARTING_CREDITS,

    // Combat
    power: 50,
    charging: false,
    canFire: true,
    currentWeapon: 0,

    // Inventory (ammo counts, synced with WEAPONS)
    inventory: {},

    // Turn system
    turnState: CONFIG.TURN_STATES.PLAYER_AIM,
    currentEnemyIndex: 0,

    // Camera
    cameraMode: CONFIG.CAMERA_MODES.FIRST_PERSON,

    // Wind
    wind: { x: 0, z: 0 },

    // Entity arrays
    enemies: [],
    projectiles: [],
    explosions: [],
    craters: [],
    fires: [], // For napalm

    // Impact smoke (lasts 1 turn)
    impactSmoke: null,

    // Guided missile state
    guidedMissile: null,
    isGuidingMissile: false,

    // Air strike state
    isTargetingAirStrike: false,
    airStrikeTarget: null,

    // Mobile
    isMobile: false,

    // Initialize inventory from WEAPONS
    initInventory() {
        WEAPONS.forEach((weapon, index) => {
            this.inventory[weapon.id] = weapon.ammo === Infinity ? Infinity : 0;
        });
        // Give starting ammo for basic weapons
        this.inventory['baby_missile'] = Infinity;
    },

    // Add ammo for a weapon
    addAmmo(weaponId, amount) {
        if (this.inventory[weaponId] !== Infinity) {
            this.inventory[weaponId] = (this.inventory[weaponId] || 0) + amount;
        }
    },

    // Use ammo
    useAmmo(weaponId) {
        if (this.inventory[weaponId] === Infinity) return true;
        if (this.inventory[weaponId] > 0) {
            this.inventory[weaponId]--;
            return true;
        }
        return false;
    },

    // Get ammo count for current weapon
    getCurrentAmmo() {
        const weapon = WEAPONS[this.currentWeapon];
        return this.inventory[weapon.id];
    },

    // Check if can fire current weapon
    canFireCurrentWeapon() {
        const weapon = WEAPONS[this.currentWeapon];
        return this.inventory[weapon.id] === Infinity || this.inventory[weapon.id] > 0;
    },

    // Add credits
    addCredits(amount) {
        this.credits += amount;
        UI.updateCredits();
    },

    // Spend credits
    spendCredits(amount) {
        if (this.credits >= amount) {
            this.credits -= amount;
            UI.updateCredits();
            return true;
        }
        return false;
    },

    // Reset for new game
    reset() {
        this.started = false;
        this.score = 0;
        this.round = 1;
        this.health = 100;
        this.credits = CONFIG.STARTING_CREDITS;
        this.power = 50;
        this.currentWeapon = 0;
        this.turnState = CONFIG.TURN_STATES.PLAYER_AIM;
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.craters = [];
        this.fires = [];
        this.initInventory();
    }
};

// Initialize inventory on load
GameState.initInventory();
