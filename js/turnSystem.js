// ============================================
// TURNSYSTEM.JS - Turn-Based Gameplay
// ============================================

const TurnSystem = {
    currentEnemyIndex: 0,
    enemyTurnDelay: 1.5,
    enemyTurnTimer: 0,

    // Initialize turn system
    init() {
        GameState.turnState = CONFIG.TURN_STATES.PLAYER_AIM;
    },

    // Player fires - end their turn
    playerFired() {
        GameState.turnState = CONFIG.TURN_STATES.PLAYER_FIRED;
        UI.showMessage('SHOT FIRED!');
    },

    // Called when all projectiles have landed
    projectilesLanded() {
        if (GameState.turnState !== CONFIG.TURN_STATES.PLAYER_FIRED) return;

        // Clear impact smoke at end of player's turn
        WeaponSystem.clearImpactSmoke();

        // Check if all enemies destroyed
        if (GameState.enemies.length === 0) {
            this.endRound();
            return;
        }

        // Start enemy turns
        this.startEnemyTurns();
    },

    // Start enemy turn sequence
    startEnemyTurns() {
        GameState.turnState = CONFIG.TURN_STATES.ENEMY_TURN;
        this.currentEnemyIndex = 0;
        this.enemyTurnTimer = this.enemyTurnDelay;
        UI.showMessage('ENEMY TURN');
    },

    // Update turn system
    update(delta) {
        // Wait for projectiles to land
        if (GameState.turnState === CONFIG.TURN_STATES.PLAYER_FIRED) {
            if (GameState.projectiles.length === 0 && !GameState.isGuidingMissile && !GameState.isTargetingAirStrike) {
                this.projectilesLanded();
            }
            return;
        }

        // Process enemy turns
        if (GameState.turnState === CONFIG.TURN_STATES.ENEMY_TURN) {
            this.enemyTurnTimer -= delta;

            if (this.enemyTurnTimer <= 0) {
                if (this.currentEnemyIndex < GameState.enemies.length) {
                    // Current enemy fires
                    Enemies.fire(GameState.enemies[this.currentEnemyIndex]);
                    this.currentEnemyIndex++;
                    this.enemyTurnTimer = this.enemyTurnDelay;
                } else {
                    // All enemies have fired, wait for projectiles
                    if (GameState.projectiles.length === 0) {
                        this.endEnemyTurns();
                    }
                }
            }
        }
    },

    // End enemy turns
    endEnemyTurns() {
        // Check if player is dead
        if (GameState.health <= 0) {
            this.gameOver();
            return;
        }

        // Back to player turn
        GameState.turnState = CONFIG.TURN_STATES.PLAYER_AIM;
        GameState.canFire = true;
        UI.showMessage('YOUR TURN');
    },

    // End round
    endRound() {
        GameState.turnState = CONFIG.TURN_STATES.ROUND_END;

        // Award round bonus
        const bonus = CONFIG.ROUND_BONUS + (GameState.round * 200);
        GameState.addCredits(bonus);

        UI.showMessage(`ROUND ${GameState.round} COMPLETE! +$${bonus}`);

        // Open shop after delay
        setTimeout(() => {
            Shop.open();
        }, 2000);
    },

    // Start next round
    startNextRound() {
        GameState.round++;

        // Heal player a bit
        GameState.health = Math.min(100, GameState.health + 30);
        UI.updateHealth();

        // Spawn more enemies
        const enemyCount = CONFIG.STARTING_ENEMIES + (GameState.round - 1) * CONFIG.ENEMIES_PER_ROUND_INCREASE;
        Enemies.spawn(enemyCount);

        // New wind
        this.generateWind();

        // Start player turn (clear any leftover smoke)
        WeaponSystem.clearImpactSmoke();
        GameState.turnState = CONFIG.TURN_STATES.PLAYER_AIM;
        GameState.canFire = true;

        UI.updateRound();
        UI.showMessage(`ROUND ${GameState.round}`);
    },

    // Generate random wind
    generateWind() {
        const strength = Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        GameState.wind.x = Math.cos(angle) * strength;
        GameState.wind.z = Math.sin(angle) * strength;
        UI.updateWind(angle, strength);
    },

    // Damage player
    damagePlayer(damage) {
        GameState.health -= damage;
        GameState.health = Math.max(0, GameState.health);
        UI.updateHealth();
        UI.flashDamage();

        if (GameState.health <= 0) {
            this.gameOver();
        }
    },

    // Game over
    gameOver() {
        GameState.started = false;
        document.exitPointerLock();

        document.getElementById('final-score').textContent = `Final Score: ${GameState.score}`;
        document.getElementById('final-credits').textContent = `Credits Earned: $${GameState.credits.toLocaleString()}`;
        document.getElementById('game-over').classList.add('show');
    },

    // Can player fire?
    canPlayerFire() {
        return GameState.started &&
            GameState.turnState === CONFIG.TURN_STATES.PLAYER_AIM &&
            GameState.canFire &&
            !GameState.isGuidingMissile &&
            !GameState.isTargetingAirStrike;
    }
};
