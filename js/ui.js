// ============================================
// UI.JS - HUD & User Interface
// ============================================

const UI = {
    minimapCanvas: null,
    minimapCtx: null,

    init() {
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
    },

    // Show temporary message
    showMessage(text) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.classList.add('show');
        setTimeout(() => msg.classList.remove('show'), 2000);
    },

    // Update score display
    updateScore() {
        document.getElementById('score').textContent = GameState.score;
    },

    // Update credits display
    updateCredits() {
        const el = document.getElementById('credits');
        if (el) el.textContent = '$' + GameState.credits.toLocaleString();
    },

    // Update health bar
    updateHealth() {
        document.getElementById('health-bar').style.width = `${GameState.health}%`;
    },

    // Update enemy count
    updateEnemyCount() {
        document.getElementById('enemies').textContent = GameState.enemies.length;
    },

    // Update round display
    updateRound() {
        document.getElementById('round').textContent = GameState.round;
    },

    // Update power display
    updatePower() {
        document.getElementById('power-bar').style.height = `${GameState.power}%`;
        document.getElementById('power-value').textContent = Math.round(GameState.power);
    },

    // Update angle display
    updateAngle(data) {
        // Handle both Euler objects and plain {x, y} objects
        const pitchAngle = data.x !== undefined ? data.x : 0;
        const angleDeg = Math.round(-pitchAngle * 180 / Math.PI);
        document.getElementById('angle-value').innerHTML = `${angleDeg}<span id="angle-unit">°</span>`;
    },

    // Update wind display
    updateWind(angle, strength) {
        const windArrow = document.getElementById('wind-arrow');
        windArrow.style.transform = `rotate(${angle * 180 / Math.PI - 90}deg)`;
        windArrow.style.color = strength > 10 ? '#ff6432' : '#64c8ff';
        document.getElementById('wind-value').textContent = `${strength.toFixed(1)} m/s`;
    },

    // Update weapon display
    updateWeaponDisplay() {
        const weapon = WEAPONS[GameState.currentWeapon];
        const ammo = GameState.inventory[weapon.id];

        document.getElementById('weapon-name').textContent = weapon.name;
        document.getElementById('weapon-ammo').textContent = ammo === Infinity ? '∞' : `x${ammo}`;

        // Update weapon selector buttons
        document.querySelectorAll('.weapon-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === GameState.currentWeapon);

            // Gray out if no ammo
            const w = WEAPONS[index];
            if (w) {
                const a = GameState.inventory[w.id];
                btn.classList.toggle('disabled', a !== Infinity && a <= 0);
            }
        });
    },

    // Update turn indicator
    updateTurnIndicator() {
        const el = document.getElementById('turn-indicator');
        if (!el) return;

        switch (GameState.turnState) {
            case CONFIG.TURN_STATES.PLAYER_AIM:
                el.textContent = 'YOUR TURN';
                el.className = 'turn-indicator player-turn';
                break;
            case CONFIG.TURN_STATES.PLAYER_FIRED:
                el.textContent = 'SHOT IN FLIGHT...';
                el.className = 'turn-indicator waiting';
                break;
            case CONFIG.TURN_STATES.ENEMY_TURN:
                el.textContent = 'ENEMY TURN';
                el.className = 'turn-indicator enemy-turn';
                break;
            case CONFIG.TURN_STATES.SHOP:
                el.textContent = 'SHOP';
                el.className = 'turn-indicator shop';
                break;
        }
    },

    // Flash damage effect
    flashDamage() {
        const flash = document.getElementById('damage-flash');
        flash.classList.add('show');
        setTimeout(() => flash.classList.remove('show'), 200);
    },

    // Show/hide laser pointer for air strike
    showLaserPointer(show) {
        const el = document.getElementById('laser-pointer');
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    },

    // Update minimap
    updateMinimap() {
        const canvas = this.minimapCanvas;
        const ctx = this.minimapCtx;
        if (!ctx) return;

        const scale = canvas.width / CONFIG.TERRAIN_SIZE;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Clear
        ctx.fillStyle = 'rgba(20, 10, 5, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw terrain border
        ctx.strokeStyle = 'rgba(255, 100, 50, 0.3)';
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

        // Draw enemies
        ctx.fillStyle = '#ff3333';
        GameState.enemies.forEach(enemy => {
            const x = centerX + enemy.position.x * scale;
            const y = centerY + enemy.position.z * scale;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw player (use tank position for accuracy)
        ctx.fillStyle = '#32ff64';
        const tankPos = window.playerTank ? window.playerTank.position : CameraSystem.camera.position;
        ctx.beginPath();
        ctx.arc(centerX + tankPos.x * scale, centerY + tankPos.z * scale, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw player direction (use tank direction)
        const dir = CameraSystem.getTankForwardDirection();
        ctx.strokeStyle = '#32ff64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + tankPos.x * scale, centerY + tankPos.z * scale);
        ctx.lineTo(
            centerX + (tankPos.x + dir.x * 30) * scale,
            centerY + (tankPos.z + dir.z * 30) * scale
        );
        ctx.stroke();
    }
};
