// Three.js Background Animation
// Randomly selects between "Wave Plane" and "Particle Network" on load
// Both feature complex mathematical animations and subtle mouse interaction

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Common Setup
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Interaction Variables
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(9999, 9999);

    document.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Random Selection
    const mode = Math.random() > 0.5 ? 'wave' : 'network';

    let camera, animate;

    if (mode === 'wave') {
        ({ camera, animate } = setupWavePlane(scene, renderer, raycaster, mouse));
    } else {
        ({ camera, animate } = setupParticleNetwork(scene, renderer, raycaster, mouse));
    }

    // Start Animation Loop
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});

// --- Variation 1: The Wave Plane ---
function setupWavePlane(scene, renderer, raycaster, mouse) {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    camera.position.y = 20;
    camera.rotation.x = -0.5;

    const geometry = new THREE.PlaneGeometry(150, 150, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0x555555,
        wireframe: true,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const positionAttribute = geometry.attributes.position;
    const originalPositions = positionAttribute.array.slice();
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Raycasting
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(plane);
        let localIntersectPoint = null;
        if (intersects.length > 0) {
            localIntersectPoint = plane.worldToLocal(intersects[0].point.clone());
        }

        for (let i = 0; i < positionAttribute.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];

            // Wave Math
            let z = Math.sin(x * 0.1 + time) * 5 +
                Math.cos(y * 0.1 + time) * 5 +
                Math.sin((x + y) * 0.05 + time * 0.5) * 3;

            // Interaction
            if (localIntersectPoint) {
                const dx = x - localIntersectPoint.x;
                const dy = y - localIntersectPoint.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 15) {
                    const force = (15 - dist) / 15;
                    z += Math.sin(dist * 0.8 - time * 5) * 2 * force;
                }
            }
            positionAttribute.setZ(i, z);
        }
        positionAttribute.needsUpdate = true;
        plane.rotation.z = time * 0.05;
        renderer.render(scene, camera);
    }

    return { camera, animate };
}

// --- Variation 2: The Particle Network (3D) ---
function setupParticleNetwork(scene, renderer, raycaster, mouse) {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;

    // Add Fog for depth perception
    scene.fog = new THREE.FogExp2(0x000000, 0.0035);

    // Add Lighting for 3D Meshes
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const particleCount = 450; // Increased by 50%

    // 3D Mesh Geometry & Material
    const geometry = new THREE.IcosahedronGeometry(1.5, 0); // Low poly sphere
    const material = new THREE.MeshBasicMaterial({
        color: 0x888888,
        wireframe: true
    });

    // Instanced Mesh for performance
    const mesh = new THREE.InstancedMesh(geometry, material, particleCount);
    scene.add(mesh);

    // Store positions for simulation
    const positions = [];
    const dummy = new THREE.Object3D(); // Helper for matrix updates

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 120;
        const z = (Math.random() - 0.5) * 300;

        positions.push(x, y, z);

        // Random initial rotation
        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }

    // Lines Geometry (Dynamic)
    const linesGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.3
    });
    const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
    scene.add(linesMesh);

    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01; // Faster time for quicker expansion

        // Mouse interaction vector
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const mousePos = camera.position.clone().add(dir.multiplyScalar(distance));

        // Update Particles
        for (let i = 0; i < particleCount; i++) {
            let px = positions[i * 3];
            let py = positions[i * 3 + 1];
            let pz = positions[i * 3 + 2];

            // Flow Field Movement (Trigonometric Noise)
            const vx = Math.sin(py * 0.02 + time) * 0.15; // Increased speed
            const vy = Math.cos(pz * 0.02 + time) * 0.15;
            const vz = Math.sin(px * 0.02 + time) * 0.15;

            px += vx;
            py += vy;
            pz += vz;

            // Wrap around edges (Toroidal space)
            if (px > 100) px = -100;
            if (px < -100) px = 100;
            if (py > 60) py = -60;
            if (py < -60) py = 60;
            if (pz > 150) pz = -150;
            if (pz < -150) pz = 150;

            // Mouse Repel
            const dx = px - mousePos.x;
            const dy = py - mousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                const force = (20 - dist) / 20;
                px += dx * 0.05 * force;
                py += dy * 0.05 * force;
            }

            // Save updated position
            positions[i * 3] = px;
            positions[i * 3 + 1] = py;
            positions[i * 3 + 2] = pz;

            // Update Instance Matrix
            dummy.position.set(px, py, pz);
            dummy.rotation.x = time * 0.1 + i * 0.1; // Very slight spin
            dummy.rotation.y = time * 0.05 + i * 0.1;
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;

        // Update Lines
        const linePositions = [];
        const connectDistance = 25;

        for (let i = 0; i < particleCount; i++) {
            for (let j = i + 1; j < particleCount; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < connectDistance) {
                    linePositions.push(
                        positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                        positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                    );
                }
            }
        }

        linesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

        // Slow rotation of entire system
        mesh.rotation.y += 0.001;
        linesMesh.rotation.y += 0.001;

        // Camera Parallax
        camera.position.x += (mouse.x * 10 - camera.position.x) * 0.05;
        camera.position.y += (-mouse.y * 10 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    return { camera, animate };
}
