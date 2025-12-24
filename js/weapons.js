// ============================================
// WEAPONS.JS - Weapons, Projectiles & Explosions
// ============================================

const WeaponSystem = {
    scene: null,

    init(scene) {
        this.scene = scene;
    },

    // Select weapon
    select(index) {
        if (index < 0 || index >= WEAPONS.length) return;

        const weapon = WEAPONS[index];
        const ammo = GameState.inventory[weapon.id];

        // Can't select weapon with no ammo (except infinite)
        if (ammo !== Infinity && ammo <= 0) {
            UI.showMessage('NO AMMO!');
            return;
        }

        GameState.currentWeapon = index;
        UI.updateWeaponDisplay();
    },

    // Fire current weapon
    fire(startPos, direction, power) {
        const weapon = WEAPONS[GameState.currentWeapon];

        // Check ammo
        if (!GameState.useAmmo(weapon.id)) {
            UI.showMessage('NO AMMO!');
            return false;
        }

        UI.updateWeaponDisplay();

        // Handle special weapon types
        if (weapon.special === 'airstrike') {
            this.startAirStrike();
            return true;
        }

        if (weapon.special === 'guided') {
            return this.fireGuidedMissile(startPos, direction, power);
        }

        // Standard projectile
        return this.fireProjectile(startPos, direction, power, weapon);
    },

    // Fire standard projectile
    fireProjectile(startPos, direction, power, weapon, isEnemy = false, isGuided = false) {
        const projectile = this.createProjectile(isEnemy ? 0xff0000 : 0xff6600);

        projectile.position.copy(startPos);
        projectile.position.add(direction.clone().multiplyScalar(3));

        const speed = power * 1.5;
        projectile.userData.velocity = direction.clone().multiplyScalar(speed);
        projectile.userData.weapon = weapon;
        projectile.userData.isEnemy = isEnemy;
        projectile.userData.isGuided = isGuided;
        projectile.userData.bounces = weapon.special === 'funky' ? 3 : 0;
        projectile.userData.fuel = isGuided ? 5 : 0; // 5 seconds of guided control

        this.scene.add(projectile);
        GameState.projectiles.push(projectile);

        this.createMuzzleFlash(startPos, direction);

        return projectile;
    },

    // Fire guided missile
    fireGuidedMissile(startPos, direction, power) {
        const weapon = WEAPONS.find(w => w.id === 'guided_missile');
        const projectile = this.fireProjectile(startPos, direction, power, weapon, false, true);

        GameState.guidedMissile = projectile;
        GameState.isGuidingMissile = true;
        CameraSystem.followingMissile = true;

        UI.showMessage('GUIDING MISSILE - USE WASD');

        return projectile;
    },

    // Start air strike targeting
    startAirStrike() {
        GameState.isTargetingAirStrike = true;
        UI.showMessage('DESIGNATE TARGET - CLICK TO CONFIRM');
        UI.showLaserPointer(true);
    },

    // Confirm air strike at position
    confirmAirStrike(targetPos) {
        GameState.isTargetingAirStrike = false;
        UI.showLaserPointer(false);

        const weapon = WEAPONS.find(w => w.id === 'air_strike');

        // Spawn 3 missiles from above with slight spread
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    0,
                    (Math.random() - 0.5) * 15
                );
                const spawnPos = targetPos.clone().add(offset);
                spawnPos.y = 150; // High in the sky

                const projectile = this.createProjectile(0xff3300);
                projectile.position.copy(spawnPos);
                projectile.userData.velocity = new THREE.Vector3(0, -80, 0);
                projectile.userData.weapon = weapon;
                projectile.userData.isEnemy = false;

                this.scene.add(projectile);
                GameState.projectiles.push(projectile);
            }, i * 200);
        }

        UI.showMessage('AIR STRIKE INBOUND!');
    },

    // Create projectile mesh
    createProjectile(color) {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color });
        const projectile = new THREE.Mesh(geometry, material);

        // Trail
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        projectile.userData.trail = trail;
        projectile.userData.trailPositions = [];
        this.scene.add(trail);

        // Glow
        const glowGeometry = new THREE.SphereGeometry(1, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        projectile.add(glow);

        return projectile;
    },

    // Create muzzle flash
    createMuzzleFlash(position, direction) {
        const flash = new THREE.PointLight(0xff6600, 3, 20);
        flash.position.copy(position);
        flash.position.add(direction.clone().multiplyScalar(3));
        this.scene.add(flash);

        setTimeout(() => this.scene.remove(flash), 100);
    },

    // Update all projectiles
    updateProjectiles(delta) {
        const gravity = CONFIG.GRAVITY;

        for (let i = GameState.projectiles.length - 1; i >= 0; i--) {
            const proj = GameState.projectiles[i];
            const vel = proj.userData.velocity;
            const weapon = proj.userData.weapon;

            // Handle guided missile controls
            if (proj.userData.isGuided && GameState.isGuidingMissile) {
                this.updateGuidedMissile(proj, delta);
            }

            // Apply gravity (less for guided missiles)
            const gravityMult = proj.userData.isGuided ? 0.3 : 1;
            vel.y += gravity * delta * gravityMult;

            // Apply wind (skip for air strike missiles)
            if (vel.y > -70) {
                vel.x += GameState.wind.x * delta * 0.1;
                vel.z += GameState.wind.z * delta * 0.1;
            }

            // Move
            proj.position.add(vel.clone().multiplyScalar(delta));

            // Update trail
            proj.userData.trailPositions.push(proj.position.clone());
            if (proj.userData.trailPositions.length > 20) {
                proj.userData.trailPositions.shift();
            }
            const trailGeometry = new THREE.BufferGeometry().setFromPoints(proj.userData.trailPositions);
            proj.userData.trail.geometry.dispose();
            proj.userData.trail.geometry = trailGeometry;

            // Reduce guided missile fuel
            if (proj.userData.isGuided) {
                proj.userData.fuel -= delta;
                if (proj.userData.fuel <= 0) {
                    GameState.isGuidingMissile = false;
                    CameraSystem.followingMissile = false;
                }
            }

            // Check terrain collision
            const terrainY = Terrain.getHeight(proj.position.x, proj.position.z);
            if (proj.position.y <= terrainY + 0.5) {
                // Funky bomb bounces
                if (proj.userData.bounces > 0) {
                    proj.userData.bounces--;
                    vel.y = Math.abs(vel.y) * 0.6;
                    vel.x += (Math.random() - 0.5) * 20;
                    vel.z += (Math.random() - 0.5) * 20;
                    proj.position.y = terrainY + 1;
                    continue;
                }

                this.handleImpact(proj, weapon);
                this.removeProjectile(proj, i);
            }

            // Out of bounds
            if (proj.position.y < -100 || Math.abs(proj.position.x) > CONFIG.TERRAIN_SIZE || Math.abs(proj.position.z) > CONFIG.TERRAIN_SIZE) {
                this.removeProjectile(proj, i);
            }
        }
    },

    // Update guided missile controls
    updateGuidedMissile(proj, delta) {
        const turnSpeed = 2;
        const vel = proj.userData.velocity;
        const speed = vel.length();

        // Get input direction
        let adjustX = 0, adjustY = 0;
        if (Controls.keys.moveLeft) adjustX = -1;
        if (Controls.keys.moveRight) adjustX = 1;
        if (Controls.keys.moveForward) adjustY = 1;
        if (Controls.keys.moveBackward) adjustY = -1;

        // Adjust velocity direction
        if (adjustX !== 0 || adjustY !== 0) {
            vel.x += adjustX * turnSpeed * delta * speed * 0.1;
            vel.y += adjustY * turnSpeed * delta * speed * 0.1;
            vel.normalize().multiplyScalar(speed);
        }
    },

    // Handle projectile impact
    handleImpact(proj, weapon) {
        const pos = proj.position.clone();

        // Stop guided missile mode
        if (proj.userData.isGuided) {
            GameState.isGuidingMissile = false;
            GameState.guidedMissile = null;
            CameraSystem.followingMissile = false;
        }

        // Handle special weapons
        if (weapon.special === 'dirt') {
            Terrain.addDirt(pos, weapon.radius, 8);
            this.createExplosion(pos, weapon.radius * 0.5, 0, true);
            return;
        }

        if (weapon.special === 'digger') {
            // Create tunnel effect
            for (let i = 0; i < 5; i++) {
                const tunnelPos = pos.clone();
                tunnelPos.x += i * 3;
                tunnelPos.z += i * 3;
                Terrain.deform(tunnelPos, 4, 5);
            }
        }

        if (weapon.special === 'mirv' && !proj.userData.isEnemy) {
            // Spawn cluster bombs
            for (let j = 0; j < weapon.cluster; j++) {
                setTimeout(() => {
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 30,
                        20,
                        (Math.random() - 0.5) * 30
                    );
                    const clusterPos = pos.clone().add(offset);
                    const clusterProj = this.createProjectile(0xff6600);
                    clusterProj.position.copy(clusterPos);
                    clusterProj.userData.velocity = new THREE.Vector3(
                        (Math.random() - 0.5) * 10,
                        -30,
                        (Math.random() - 0.5) * 10
                    );
                    clusterProj.userData.weapon = { ...weapon, special: null, cluster: 0 };
                    this.scene.add(clusterProj);
                    GameState.projectiles.push(clusterProj);
                }, j * 100);
            }
            return;
        }

        if (weapon.special === 'napalm') {
            // Create fire spread
            this.createNapalm(pos, weapon.radius);
        }

        // Standard explosion
        this.createExplosion(pos, weapon.radius, weapon.damage);

        // Deform terrain and paint scorch marks
        Terrain.deform(pos, weapon.radius * 0.8, weapon.radius * 0.5);
        Terrain.scorch(pos, weapon.radius);

        // Create smoke at impact (replaces previous smoke)
        this.createImpactSmoke(pos, weapon.radius);
    },

    // Create EPIC explosion effect
    createExplosion(position, radius, damage, skipDamage = false) {
        const explosion = new THREE.Group();
        const groundY = Terrain.getHeight(position.x, position.z);
        explosion.position.set(position.x, groundY, position.z);

        // === CORE: Intense white-hot center ===
        const coreGeometry = new THREE.SphereGeometry(radius * 0.4, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffee,
            transparent: true,
            opacity: 1.0
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = radius * 0.3;
        explosion.add(core);

        // === INNER FIRE: Orange-yellow flames ===
        const innerFireGeometry = new THREE.SphereGeometry(radius * 0.7, 16, 16);
        const innerFireMaterial = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.9
        });
        const innerFire = new THREE.Mesh(innerFireGeometry, innerFireMaterial);
        innerFire.position.y = radius * 0.3;
        explosion.add(innerFire);

        // === OUTER FIRE: Red-orange expanding fireball ===
        const outerFireGeometry = new THREE.SphereGeometry(radius * 1.0, 20, 20);
        const outerFireMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.7
        });
        const outerFire = new THREE.Mesh(outerFireGeometry, outerFireMaterial);
        outerFire.position.y = radius * 0.5;
        explosion.add(outerFire);

        // === SHOCKWAVE RING: Expanding ground ring ===
        const ringGeometry = new THREE.RingGeometry(radius * 0.8, radius * 1.2, 32);
        ringGeometry.rotateX(-Math.PI / 2);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.y = 0.5;
        explosion.add(ring);
        explosion.userData.ring = ring;

        // === SMOKE CLOUDS: Dark billowing smoke ===
        for (let i = 0; i < 5; i++) {
            const smokeSize = radius * (0.5 + Math.random() * 0.5);
            const smokeGeometry = new THREE.SphereGeometry(smokeSize, 12, 12);
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x222222,
                transparent: true,
                opacity: 0.4
            });
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            smoke.position.set(
                (Math.random() - 0.5) * radius,
                radius * 0.5 + Math.random() * radius,
                (Math.random() - 0.5) * radius
            );
            smoke.userData.riseSpeed = 2 + Math.random() * 3;
            explosion.add(smoke);
        }

        // === DEBRIS PARTICLES: Flying chunks ===
        this.createDebris(position, radius);

        // === DYNAMIC LIGHT ===
        const light = new THREE.PointLight(0xff6600, 8, radius * 8);
        light.position.y = radius;
        explosion.add(light);

        // Secondary warm light
        const light2 = new THREE.PointLight(0xff4400, 4, radius * 4);
        light2.position.y = 2;
        explosion.add(light2);

        explosion.userData.lifetime = 1.0;
        explosion.userData.maxLifetime = 1.0;
        explosion.userData.initialRadius = radius;

        this.scene.add(explosion);
        GameState.explosions.push(explosion);

        // Create the CRATER
        this.createEpicCrater(position, radius);

        if (skipDamage) return;

        // Damage enemies
        GameState.enemies.forEach(enemy => {
            const dist = enemy.position.distanceTo(position);
            if (dist < radius * 2) {
                const dmg = damage * (1 - dist / (radius * 2));
                Enemies.damage(enemy, dmg);
            }
        });

        // Damage player
        const playerDist = CameraSystem.camera.position.distanceTo(position);
        if (playerDist < radius * 2) {
            const dmg = damage * (1 - playerDist / (radius * 2));
            TurnSystem.damagePlayer(dmg);
        }
    },

    // Create flying debris particles
    createDebris(position, radius) {
        const debrisCount = Math.floor(radius * 2);
        const groundY = Terrain.getHeight(position.x, position.z);

        for (let i = 0; i < debrisCount; i++) {
            const size = 0.3 + Math.random() * 0.8;
            const geometry = new THREE.BoxGeometry(size, size * 0.5, size);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.08, 0.3, 0.2 + Math.random() * 0.15),
                roughness: 1,
                metalness: 0
            });
            const debris = new THREE.Mesh(geometry, material);

            // Start position at ground level
            debris.position.set(
                position.x + (Math.random() - 0.5) * radius * 0.5,
                groundY + 0.5,
                position.z + (Math.random() - 0.5) * radius * 0.5
            );

            // Random rotation
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            // Explosion velocity - upward and outward
            const angle = Math.random() * Math.PI * 2;
            const speed = 15 + Math.random() * 25;
            debris.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed * 0.5,
                10 + Math.random() * 20,
                Math.sin(angle) * speed * 0.5
            );
            debris.userData.rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            debris.userData.lifetime = 2 + Math.random();
            debris.userData.groundY = groundY;

            debris.castShadow = true;
            this.scene.add(debris);

            // Store in a debris array (reusing craters for simplicity)
            if (!GameState.debris) GameState.debris = [];
            GameState.debris.push(debris);
        }
    },

    // Crater visuals removed - terrain deformation handles it naturally
    createEpicCrater(position, radius) {
        // The Terrain.deform() call in handleImpact already modifies 
        // the actual terrain geometry, which looks natural
        // No additional overlays needed
    },

    // Create smoke at impact location (replaces any previous smoke)
    createImpactSmoke(position, radius) {
        // Remove any existing smoke first
        this.clearImpactSmoke();

        const groundY = Terrain.getHeight(position.x, position.z);
        const smokeGroup = new THREE.Group();
        smokeGroup.position.set(position.x, groundY, position.z);

        // Create 6 smoke particles
        for (let i = 0; i < 6; i++) {
            const smokeSize = radius * (0.4 + Math.random() * 0.4);
            const smokeGeometry = new THREE.SphereGeometry(smokeSize, 8, 8);
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.4
            });
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            smoke.position.set(
                (Math.random() - 0.5) * radius,
                radius * 0.3 + Math.random() * radius * 0.5,
                (Math.random() - 0.5) * radius
            );
            smoke.userData.riseSpeed = 1 + Math.random() * 2;
            smoke.userData.driftX = (Math.random() - 0.5) * 0.5;
            smoke.userData.driftZ = (Math.random() - 0.5) * 0.5;
            smokeGroup.add(smoke);
        }

        this.scene.add(smokeGroup);
        GameState.impactSmoke = smokeGroup;
    },

    // Clear all impact smoke
    clearImpactSmoke() {
        if (GameState.impactSmoke) {
            // Dispose geometries and materials
            GameState.impactSmoke.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.scene.remove(GameState.impactSmoke);
            GameState.impactSmoke = null;
        }
    },

    // Update impact smoke (animate rising)
    updateImpactSmoke(delta) {
        if (!GameState.impactSmoke) return;

        GameState.impactSmoke.children.forEach(smoke => {
            // Rise and drift
            smoke.position.y += smoke.userData.riseSpeed * delta;
            smoke.position.x += smoke.userData.driftX * delta;
            smoke.position.z += smoke.userData.driftZ * delta;

            // Expand
            smoke.scale.multiplyScalar(1 + delta * 0.3);

            // Fade slightly over time
            if (smoke.material.opacity > 0.1) {
                smoke.material.opacity -= delta * 0.05;
            }
        });
    },

    // Legacy crater for backwards compatibility
    createCrater(position, radius) {
        this.createEpicCrater(position, radius);
    },

    // Create napalm fire spread
    createNapalm(position, radius) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = radius * 0.8;
            const firePos = position.clone();
            firePos.x += Math.cos(angle) * dist;
            firePos.z += Math.sin(angle) * dist;
            firePos.y = Terrain.getHeight(firePos.x, firePos.z) + 0.5;

            // Create fire sprite/particle
            const fireGeom = new THREE.SphereGeometry(2, 8, 8);
            const fireMat = new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.8
            });
            const fire = new THREE.Mesh(fireGeom, fireMat);
            fire.position.copy(firePos);
            fire.userData.lifetime = 3;
            fire.userData.damageTimer = 0;
            this.scene.add(fire);
            GameState.fires.push(fire);
        }
    },

    // Update explosions with enhanced effects
    updateExplosions(delta) {
        // Update explosion effects
        for (let i = GameState.explosions.length - 1; i >= 0; i--) {
            const exp = GameState.explosions[i];
            exp.userData.lifetime -= delta;

            const progress = 1 - exp.userData.lifetime / exp.userData.maxLifetime;
            const radius = exp.userData.initialRadius || 8;

            // Expand the fireball
            const scaleMultiplier = 1 + progress * 1.5;

            exp.children.forEach((child, index) => {
                // Handle different child types
                if (child.userData && child.userData.riseSpeed) {
                    // Smoke rises and expands
                    child.position.y += child.userData.riseSpeed * delta;
                    child.scale.setScalar(1 + progress * 2);
                    if (child.material) {
                        child.material.opacity = (1 - progress) * 0.5;
                    }
                } else if (exp.userData.ring === child) {
                    // Shockwave ring expands outward
                    const ringScale = 1 + progress * 3;
                    child.scale.set(ringScale, 1, ringScale);
                    if (child.material) {
                        child.material.opacity = (1 - progress) * 0.6;
                    }
                } else {
                    // Regular fire/explosion elements
                    if (child.material) {
                        child.material.opacity = Math.max(0, 1 - progress * 1.2);
                    }
                    if (child.intensity !== undefined) {
                        child.intensity = 8 * (1 - progress);
                    }
                }
            });

            // Scale up the whole explosion
            exp.scale.setScalar(scaleMultiplier);

            if (exp.userData.lifetime <= 0) {
                // Dispose of materials/geometries to prevent memory leak
                exp.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.scene.remove(exp);
                GameState.explosions.splice(i, 1);
            }
        }

        // Update debris particles with physics
        if (GameState.debris) {
            for (let i = GameState.debris.length - 1; i >= 0; i--) {
                const debris = GameState.debris[i];
                debris.userData.lifetime -= delta;

                // Apply gravity
                debris.userData.velocity.y -= 40 * delta;

                // Move debris
                debris.position.add(debris.userData.velocity.clone().multiplyScalar(delta));

                // Rotate debris
                debris.rotation.x += debris.userData.rotationSpeed.x * delta;
                debris.rotation.y += debris.userData.rotationSpeed.y * delta;
                debris.rotation.z += debris.userData.rotationSpeed.z * delta;

                // Ground collision
                const groundY = Terrain.getHeight(debris.position.x, debris.position.z);
                if (debris.position.y < groundY + 0.2) {
                    debris.position.y = groundY + 0.2;
                    // Bounce with friction
                    debris.userData.velocity.y = Math.abs(debris.userData.velocity.y) * 0.3;
                    debris.userData.velocity.x *= 0.7;
                    debris.userData.velocity.z *= 0.7;
                    debris.userData.rotationSpeed.multiplyScalar(0.5);
                }

                // Remove when lifetime ends or velocity is very low
                if (debris.userData.lifetime <= 0 ||
                    (debris.userData.velocity.length() < 0.5 && debris.position.y < groundY + 0.5)) {
                    if (debris.geometry) debris.geometry.dispose();
                    if (debris.material) debris.material.dispose();
                    this.scene.remove(debris);
                    GameState.debris.splice(i, 1);
                }
            }
        }

        // Update napalm fires
        for (let i = GameState.fires.length - 1; i >= 0; i--) {
            const fire = GameState.fires[i];
            fire.userData.lifetime -= delta;
            fire.userData.damageTimer += delta;

            // Flicker effect
            fire.scale.setScalar(0.8 + Math.random() * 0.4);
            fire.material.opacity = 0.5 + Math.random() * 0.3;

            // Damage nearby enemies periodically
            if (fire.userData.damageTimer > 0.5) {
                fire.userData.damageTimer = 0;
                GameState.enemies.forEach(enemy => {
                    if (enemy.position.distanceTo(fire.position) < 5) {
                        Enemies.damage(enemy, 5);
                    }
                });
            }

            if (fire.userData.lifetime <= 0) {
                this.scene.remove(fire);
                GameState.fires.splice(i, 1);
            }
        }
    },

    // Remove projectile
    removeProjectile(proj, index) {
        this.scene.remove(proj);
        this.scene.remove(proj.userData.trail);
        GameState.projectiles.splice(index, 1);
    }
};
