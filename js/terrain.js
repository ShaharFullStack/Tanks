// ============================================
// TERRAIN.JS - Terrain Generation & Deformation
// ============================================

const Terrain = {
    mesh: null,
    heightData: null,

    // Create the terrain mesh
    create(scene) {
        const geometry = new THREE.PlaneGeometry(
            CONFIG.TERRAIN_SIZE,
            CONFIG.TERRAIN_SIZE,
            CONFIG.TERRAIN_SEGMENTS,
            CONFIG.TERRAIN_SEGMENTS
        );
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;

        // Generate heightmap using multiple octaves of noise
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];

            let height = 0;
            height += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15;
            height += Math.sin(x * 0.05 + 1) * Math.cos(z * 0.03) * 8;
            height += Math.sin(x * 0.1) * Math.sin(z * 0.1) * 4;
            height += (Math.random() - 0.5) * 2;

            // Flatten center area for player
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < 30) {
                height *= distFromCenter / 30;
            }

            vertices[i + 1] = height;
        }

        geometry.computeVertexNormals();

        // Add vertex colors for scorch marks
        const vertexCount = vertices.length / 3;
        const colors = new Float32Array(vertexCount * 3);

        // Initialize all vertices to the base terrain color (sandy brown)
        const baseColor = new THREE.Color(0x8b6914);
        for (let i = 0; i < vertexCount; i++) {
            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Material with vertex colors enabled
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.heightData = vertices;
        scene.add(this.mesh);

        // Add rocks
        this.addRocks(scene, 50);

        return this.mesh;
    },

    // Add decorative rocks
    addRocks(scene, count) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.DodecahedronGeometry(Math.random() * 3 + 1, 0);
            const material = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.8,
                metalness: 0.2
            });
            const rock = new THREE.Mesh(geometry, material);
            rock.castShadow = true;
            rock.receiveShadow = true;
            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            rock.scale.y = Math.random() * 0.5 + 0.5;

            const x = (Math.random() - 0.5) * CONFIG.TERRAIN_SIZE * 0.8;
            const z = (Math.random() - 0.5) * CONFIG.TERRAIN_SIZE * 0.8;
            rock.position.set(x, this.getHeight(x, z), z);
            scene.add(rock);
        }
    },

    // Get terrain height at world position
    getHeight(x, z) {
        if (!this.heightData) return 0;

        const halfSize = CONFIG.TERRAIN_SIZE / 2;
        const segmentSize = CONFIG.TERRAIN_SIZE / CONFIG.TERRAIN_SEGMENTS;

        const gridX = Math.floor((x + halfSize) / segmentSize);
        const gridZ = Math.floor((z + halfSize) / segmentSize);

        if (gridX < 0 || gridX >= CONFIG.TERRAIN_SEGMENTS || gridZ < 0 || gridZ >= CONFIG.TERRAIN_SEGMENTS) {
            return 0;
        }

        const index = (gridZ * (CONFIG.TERRAIN_SEGMENTS + 1) + gridX) * 3 + 1;
        return this.heightData[index] || 0;
    },

    // DEFORM TERRAIN - Create crater effect
    deform(worldPos, radius, depth) {
        if (!this.mesh) return;

        const geometry = this.mesh.geometry;
        const vertices = geometry.attributes.position.array;
        const halfSize = CONFIG.TERRAIN_SIZE / 2;
        const segmentSize = CONFIG.TERRAIN_SIZE / CONFIG.TERRAIN_SEGMENTS;

        let modified = false;

        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i];
            const vy = vertices[i + 1];
            const vz = vertices[i + 2];

            // Calculate distance from explosion center
            const dx = vx - worldPos.x;
            const dz = vz - worldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < radius) {
                // Calculate deformation based on distance (crater shape)
                const factor = 1 - (dist / radius);
                const deformAmount = depth * factor * factor; // Quadratic falloff

                // Lower the terrain
                vertices[i + 1] -= deformAmount;
                modified = true;
            }
        }

        if (modified) {
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
            this.heightData = vertices;
        }
    },

    // SCORCH TERRAIN - Paint dark color at impact point
    scorch(worldPos, radius) {
        if (!this.mesh) return;

        const geometry = this.mesh.geometry;
        const vertices = geometry.attributes.position.array;
        const colors = geometry.attributes.color.array;

        // Dark scorch color
        const scorchColor = new THREE.Color(0x1a0a00);
        const baseColor = new THREE.Color(0x8b6914);

        let modified = false;

        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i];
            const vz = vertices[i + 2];

            const dx = vx - worldPos.x;
            const dz = vz - worldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < radius * 1.5) {
                // Calculate blend factor (darker in center, fades at edges)
                const factor = 1 - (dist / (radius * 1.5));
                const blendFactor = factor * factor * 0.9; // Max 90% scorch

                const colorIndex = i; // Same index as vertex

                // Get current color
                const currentR = colors[colorIndex];
                const currentG = colors[colorIndex + 1];
                const currentB = colors[colorIndex + 2];

                // Blend toward scorch color
                colors[colorIndex] = currentR + (scorchColor.r - currentR) * blendFactor;
                colors[colorIndex + 1] = currentG + (scorchColor.g - currentG) * blendFactor;
                colors[colorIndex + 2] = currentB + (scorchColor.b - currentB) * blendFactor;

                modified = true;
            }
        }

        if (modified) {
            geometry.attributes.color.needsUpdate = true;
        }
    },

    // ADD TERRAIN (for dirt bombs)
    addDirt(worldPos, radius, height) {
        if (!this.mesh) return;

        const geometry = this.mesh.geometry;
        const vertices = geometry.attributes.position.array;

        let modified = false;

        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i];
            const vz = vertices[i + 2];

            const dx = vx - worldPos.x;
            const dz = vz - worldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < radius) {
                const factor = 1 - (dist / radius);
                const addAmount = height * factor * factor;
                vertices[i + 1] += addAmount;
                modified = true;
            }
        }

        if (modified) {
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
            this.heightData = vertices;
        }
    }
};
