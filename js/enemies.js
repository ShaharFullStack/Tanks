// ============================================
// ENEMIES.JS - Enemy Tanks & AI
// ============================================

const Enemies = {
    scene: null,

    init(scene) {
        this.scene = scene;
    },

    // Create enemy tank mesh
    createTank() {
        const tank = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.BoxGeometry(3.5, 1.8, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b2500,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        tank.add(body);

        // Turret
        const turretGeometry = new THREE.CylinderGeometry(1.3, 1.5, 1, 8);
        const turret = new THREE.Mesh(turretGeometry, bodyMaterial);
        turret.position.y = 1.3;
        turret.castShadow = true;
        tank.add(turret);

        // Barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.25, 0.3, 4, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.5
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 1.5, 2);
        barrel.castShadow = true;
        tank.add(barrel);
        tank.userData.barrel = barrel;

        // Health
        tank.userData.health = 100;
        tank.userData.maxHealth = 100;

        // Health bar
        const healthBarBg = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        healthBarBg.position.y = 4;
        healthBarBg.rotation.x = -Math.PI / 4;
        tank.add(healthBarBg);

        const healthBar = new THREE.Mesh(
            new THREE.PlaneGeometry(3.8, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xff3333 })
        );
        healthBar.position.y = 4;
        healthBar.position.z = 0.01;
        healthBar.rotation.x = -Math.PI / 4;
        tank.add(healthBar);
        tank.userData.healthBar = healthBar;

        return tank;
    },

    // Spawn enemies for a round
    spawn(count) {
        // Clear existing enemies
        GameState.enemies.forEach(enemy => this.scene.remove(enemy));
        GameState.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = this.createTank();

            // Random position around the map
            let x, z, attempts = 0;
            do {
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 120;
                x = Math.cos(angle) * distance;
                z = Math.sin(angle) * distance;
                attempts++;
            } while (attempts < 10 && Math.sqrt(x * x + z * z) < 50);

            const y = Terrain.getHeight(x, z) + 1.5;
            enemy.position.set(x, y, z);

            // Face toward player
            enemy.lookAt(0, enemy.position.y, 0);

            this.scene.add(enemy);
            GameState.enemies.push(enemy);
        }

        UI.updateEnemyCount();
    },

    // Enemy fires at player
    fire(enemy) {
        const weapon = WEAPONS[0]; // Enemies use basic missile

        // Aim at player TANK with some inaccuracy
        const targetPos = window.playerTank.position.clone();
        targetPos.x += (Math.random() - 0.5) * 25;
        targetPos.z += (Math.random() - 0.5) * 25;

        const direction = targetPos.sub(enemy.position).normalize();

        // Add arc
        direction.y += 0.3;
        direction.normalize();

        const startPos = enemy.position.clone();
        startPos.y += 2;

        const speed = 40 + Math.random() * 20;
        WeaponSystem.fireProjectile(startPos, direction, speed / 1.5, weapon, true);
    },

    // Damage enemy
    damage(enemy, amount) {
        enemy.userData.health -= amount;

        // Update health bar
        const healthPercent = Math.max(0, enemy.userData.health / enemy.userData.maxHealth);
        enemy.userData.healthBar.scale.x = healthPercent;
        enemy.userData.healthBar.position.x = (1 - healthPercent) * -1.9;

        if (enemy.userData.health <= 0) {
            this.destroy(enemy);
        }
    },

    // Destroy enemy
    destroy(enemy) {
        // Big explosion (no damage to prevent recursion)
        WeaponSystem.createExplosion(enemy.position.clone(), 12, 0, true);

        // Remove from scene
        this.scene.remove(enemy);
        const index = GameState.enemies.indexOf(enemy);
        if (index > -1) {
            GameState.enemies.splice(index, 1);
        }

        // Award credits and score
        GameState.score += 100;
        GameState.addCredits(CONFIG.CREDITS_PER_KILL);

        UI.updateScore();
        UI.updateEnemyCount();
        UI.showMessage('ENEMY DESTROYED! +$' + CONFIG.CREDITS_PER_KILL);
    },

    // Update enemy AI (look at player tank)
    update(delta) {
        GameState.enemies.forEach(enemy => {
            if (window.playerTank) {
                const lookTarget = window.playerTank.position.clone();
                lookTarget.y = enemy.position.y;
                enemy.lookAt(lookTarget);
            }
        });
    }
};
