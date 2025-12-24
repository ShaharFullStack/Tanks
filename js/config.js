// ============================================
// CONFIG.JS - Game Constants & Weapon Definitions
// ============================================

const CONFIG = {
    // Terrain
    TERRAIN_SIZE: 500,
    TERRAIN_SEGMENTS: 100,

    // Physics
    GRAVITY: -30,
    PLAYER_SPEED: 30,

    // Game Balance
    STARTING_CREDITS: 5000,
    CREDITS_PER_KILL: 500,
    ROUND_BONUS: 1000,
    STARTING_ENEMIES: 3,
    ENEMIES_PER_ROUND_INCREASE: 1,

    // Camera
    CAMERA_MODES: {
        FIRST_PERSON: 0,
        THIRD_PERSON_CLOSE: 1,
        THIRD_PERSON_FAR: 2
    },
    CAMERA_POSITIONS: {
        FIRST_PERSON: { distance: 0, height: 5, fov: 75 },
        THIRD_PERSON_CLOSE: { distance: 15, height: 8, fov: 60 },
        THIRD_PERSON_FAR: { distance: 80, height: 60, fov: 50 }
    },

    // Turn System
    TURN_STATES: {
        PLAYER_AIM: 'PLAYER_AIM',
        PLAYER_FIRED: 'PLAYER_FIRED',
        ENEMY_TURN: 'ENEMY_TURN',
        ROUND_END: 'ROUND_END',
        SHOP: 'SHOP'
    }
};

// Weapon Definitions
const WEAPONS = [
    {
        id: 'baby_missile',
        name: 'BABY MISSILE',
        price: 0,
        damage: 25,
        radius: 6,
        ammo: Infinity,
        description: 'Basic projectile with small explosion'
    },
    {
        id: 'missile',
        name: 'MISSILE',
        price: 2000,
        damage: 35,
        radius: 10,
        ammo: 0,
        description: 'Standard explosive missile'
    },
    {
        id: 'large_missile',
        name: 'LARGE MISSILE',
        price: 5000,
        damage: 50,
        radius: 15,
        ammo: 0,
        description: 'High-yield explosive warhead'
    },
    {
        id: 'nuke',
        name: 'NUKE',
        price: 20000,
        damage: 100,
        radius: 40,
        ammo: 0,
        description: 'Tactical nuclear device - MASSIVE damage'
    },
    {
        id: 'dirt_bomb',
        name: 'DIRT BOMB',
        price: 1000,
        damage: 0,
        radius: 8,
        ammo: 0,
        special: 'dirt',
        description: 'Adds terrain on impact'
    },
    {
        id: 'digger',
        name: 'DIGGER',
        price: 3000,
        damage: 20,
        radius: 4,
        ammo: 0,
        special: 'digger',
        description: 'Tunnels through terrain'
    },
    {
        id: 'napalm',
        name: 'NAPALM',
        price: 8000,
        damage: 40,
        radius: 12,
        ammo: 0,
        special: 'napalm',
        description: 'Fire spreads across surface'
    },
    {
        id: 'mirv',
        name: 'MIRV',
        price: 15000,
        damage: 30,
        radius: 8,
        ammo: 0,
        special: 'mirv',
        cluster: 5,
        description: 'Splits into 5 warheads'
    },
    {
        id: 'funky_bomb',
        name: 'FUNKY BOMB',
        price: 10000,
        damage: 25,
        radius: 6,
        ammo: 0,
        special: 'funky',
        description: 'Bounces randomly before exploding'
    },
    {
        id: 'guided_missile',
        name: 'GUIDED MISSILE',
        price: 12000,
        damage: 45,
        radius: 12,
        ammo: 0,
        special: 'guided',
        description: 'Control trajectory mid-flight with WASD'
    },
    {
        id: 'air_strike',
        name: 'AIR STRIKE',
        price: 25000,
        damage: 60,
        radius: 15,
        ammo: 0,
        special: 'airstrike',
        description: 'Laser designator - 3 missiles from the sky'
    }
];

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, WEAPONS };
}
