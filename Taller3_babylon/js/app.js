// Configuración inicial
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Sistema de entrada
const keys = {
    w: false, a: false, s: false, d: false, space: false
};

document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'w') keys.w = true;
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if (e.key.toLowerCase() === 's') keys.s = true;
    if (e.key.toLowerCase() === 'd') keys.d = true;
    if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
});

document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'w') keys.w = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 's') keys.s = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
    if (e.code === 'Space') keys.space = false;
});

// Crear escena
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.enablePhysics(new BABYLON.Vector3(0, 0, 0));
    scene.collisionsEnabled = true;

    // Cámara en tercera persona (orbital) con control de ratón
    const camera = new BABYLON.ArcRotateCamera(
        "camera1",
        Math.PI,
        Math.PI / 3,
        12,
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.attachControl(canvas, true);
    camera.inertia = 0.6;
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 18;
    camera.minZ = 0.1;
    camera.maxZ = 10000;

    // Iluminación
    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0.5, 1, 0.5), scene);
    ambientLight.intensity = 0.9;

    const pointLight = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(50, 100, 50), scene);
    pointLight.intensity = 0.6;
    pointLight.range = 500;

    // Skybox envolvente con efecto de espacio
    const skybox = BABYLON.MeshBuilder.CreateBox("skybox", { size: 3000 }, scene);
    const skyboxMat = new BABYLON.StandardMaterial("skyboxMat", scene);
    skyboxMat.emissiveColor = new BABYLON.Color3(0.005, 0.005, 0.005); // aún más oscuro
    skyboxMat.backFaceCulling = false;
    skyboxMat.disableLighting = true;
    skyboxMat.specularColor = BABYLON.Color3.Black();
    skybox.infiniteDistance = true; // Siempre en el horizonte
    skybox.renderingGroupId = 0; // Renderizar primero
    
    // Crear textura procedural para el cielo espacial (gradiente y más estrellas)
    const skyboxTexture = new BABYLON.DynamicTexture("skyboxTexture", 1024, scene);
    const ctx = skyboxTexture.getContext();
    const grd = ctx.createLinearGradient(0, 0, 0, 1024);
    grd.addColorStop(0, "rgba(3, 1, 12, 1)");
    grd.addColorStop(1, "rgba(0, 0, 3, 1)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Dibujar estrellas (densas, pequeño flicker)
    ctx.fillStyle = "white";
    for (let i = 0; i < 520; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const size = Math.random() * 1.5 + 0.3;
        ctx.fillRect(x, y, size, size);
    }
    skyboxTexture.update();
    skyboxMat.emissiveTexture = skyboxTexture;
    skybox.material = skyboxMat;

    // Suelo amplio para referencia
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 500, height: 500 }, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/grass.png", scene);
    groundMat.diffuseTexture.uScale = 30;
    groundMat.diffuseTexture.vScale = 30;
    groundMat.specularColor = BABYLON.Color3.Black();
    ground.material = groundMat;
    ground.position.y = 0;
    ground.checkCollisions = true;

    // Casas simples para realismo
    // Casas con geometría mejorada, ventanas y puerta
    const createHouse = (x, z) => {
        // Cuerpo de la casa
        const body = BABYLON.MeshBuilder.CreateBox("houseBody", { width: 7, height: 6, depth: 7 }, scene);
        body.position.set(x, 3, z);
        
        // Techo a dos aguas (usando pirámide)
        const roof = BABYLON.MeshBuilder.CreateCylinder("houseRoof", { 
            diameterTop: 0, 
            diameterBottom: 10, 
            height: 4, 
            tessellation: 4 
        }, scene);
        roof.rotation.set(0, Math.PI / 4, 0); // Solo rotar en Y para orientación
        roof.position.set(x, 7, z);
        
        // Puerta
        const door = BABYLON.MeshBuilder.CreateBox("door", { width: 1.5, height: 2.5, depth: 0.3 }, scene);
        door.position.set(x, 1.25, z + 3.65);
        
        // Ventanas
        const window1 = BABYLON.MeshBuilder.CreateBox("window1", { width: 1.3, height: 1.3, depth: 0.25 }, scene);
        window1.position.set(x - 2.5, 3, z + 3.6);
        const window2 = window1.clone("window2");
        window2.position.set(x + 2.5, 3, z + 3.6);
        
        // Material cuerpo con textura de ladrillo
        const bodyMat = new BABYLON.StandardMaterial("bodyMat" + Math.random(), scene);
        bodyMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/floor.png", scene);
        bodyMat.diffuseTexture.uScale = 2;
        bodyMat.diffuseTexture.vScale = 2;
        bodyMat.diffuseColor = new BABYLON.Color3(0.85, 0.75, 0.65);
        body.material = bodyMat;
        
        // Material techo
        const roofMat = new BABYLON.StandardMaterial("roofMat" + Math.random(), scene);
        roofMat.diffuseColor = new BABYLON.Color3(0.5, 0.15, 0.1);
        roofMat.specularColor = BABYLON.Color3.Black();
        roof.material = roofMat;
        
        // Material puerta (madera)
        const doorMat = new BABYLON.StandardMaterial("doorMat" + Math.random(), scene);
        doorMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/wood.jpg", scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.15);
        door.material = doorMat;
        
        // Material ventanas (vidrio)
        const windowMat = new BABYLON.StandardMaterial("windowMat" + Math.random(), scene);
        windowMat.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.8);
        windowMat.specularColor = new BABYLON.Color3(1, 1, 1);
        windowMat.specularPower = 64;
        windowMat.alpha = 0.5;
        window1.material = windowMat;
        window2.material = windowMat;
    };
    const housePositions = [
        [-60, 35], [45, -30], [20, 55], [-35, -45], [65, 20], [-70, -15], [10, -60], [55, 45],
        [-20, 15], [30, -55], [-55, 60], [75, -5], [0, 70], [-80, 40], [80, -40],
        [35, 20], [-45, -20], [50, 0], [-25, 50]
    ];
    housePositions.forEach(([x, z]) => createHouse(x, z));

    // Nubes: planos con textura alfa moviéndose lentamente
    const cloudTex = new BABYLON.Texture("https://assets.babylonjs.com/environments/cloud.png", scene);
    const clouds = [];
    for (let i = 0; i < 0; i++) {
        const cloud = BABYLON.MeshBuilder.CreatePlane("cloud" + i, { size: 40 }, scene);
        cloud.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        cloud.position = new BABYLON.Vector3((Math.random() - 0.5) * 200, 40 + Math.random() * 20, (Math.random() - 0.5) * 200);
        const cMat = new BABYLON.StandardMaterial("cloudMat" + i, scene);
        cMat.diffuseTexture = cloudTex;
        cMat.opacityTexture = cloudTex;
        cMat.disableLighting = true;
        cMat.backFaceCulling = false;
        cloud.material = cMat;
        clouds.push(cloud);
    }

    // Luna grande y brillante en el cielo nocturno
    const moon = BABYLON.MeshBuilder.CreateSphere("moon", { diameter: 40, segments: 32 }, scene);
    moon.position = new BABYLON.Vector3(200, 120, 150);
    const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
    moonMat.emissiveTexture = moonMat.diffuseTexture;
    moonMat.emissiveColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    moonMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    moonMat.disableLighting = true;
    moonMat.specularColor = BABYLON.Color3.Black();
    moon.material = moonMat;

    // Contenedor del personaje y carga de modelo 3D (humanoide)
    const playerContainer = new BABYLON.TransformNode("playerContainer", scene);
    playerContainer.position.set(0, 10, 0);

    // Modelo humanoide (CesiumMan) importado desde CDN de Babylon
    BABYLON.SceneLoader.ImportMesh(
        "",
        "https://assets.babylonjs.com/meshes/",
        "CesiumMan.glb",
        scene,
        (meshes) => {
            if (meshes.length > 0) {
                const hero = meshes[0];
                hero.parent = playerContainer;
                hero.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
                hero.rotationQuaternion = null; // Usar Euler para inclinarlo
                hero.rotation.x = -0.5; // Pose de vuelo inclinada
                hero.rotation.y = Math.PI; // Mirar hacia adelante (+Z)
            }
        }
    );

    // Variables del jugador
    const playerData = {
        mesh: playerContainer,
        velocity: new BABYLON.Vector3(0, 0, 0),
        speed: 0.32,
        rotationSpeed: 0.05
    };

    // Crear meteoritos con partículas
    const meteoritos = [];
    const createMeteor = () => {
        // Forma de roca irregular con tamaños más grandes y variados
        const baseRadius = 1.8 + Math.random() * 2.0; // Entre 1.8 y 3.8
        const meteor = BABYLON.MeshBuilder.CreateIcoSphere("meteor", { radius: baseRadius, subdivisions: 4 }, scene);
        const scaleVariation = 0.9 + Math.random() * 0.7;
        meteor.scaling = new BABYLON.Vector3(
            1.1 * scaleVariation, 
            1.3 * scaleVariation, 
            1.0 * scaleVariation
        );
        meteor.position.x = (Math.random() - 0.5) * 100;
        meteor.position.y = Math.random() * 50 + 60; // Más arriba (60-110)
        meteor.position.z = Math.random() * 100 + 60;

        // Material de roca con textura y mapa normal
        const meteorMat = new BABYLON.StandardMaterial("meteorMat" + Math.random(), scene);
        meteorMat.diffuseTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/rock.png", scene);
        meteorMat.bumpTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/rockn.png", scene);
        meteorMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        meteorMat.specularPower = 8;
        meteor.material = meteorMat;

        // Sistema de partículas de fuego
        const fireSystem = new BABYLON.ParticleSystem("fire", 1200, scene);
        fireSystem.particleTexture = new BABYLON.DynamicTexture("particleTexture", 64, scene);
        
        // Textura radial para flama suave
        const ptx = fireSystem.particleTexture.getContext();
        const grad = ptx.createRadialGradient(32, 32, 4, 32, 32, 30);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.3, "rgba(255,210,120,1)");
        grad.addColorStop(0.65, "rgba(255,110,20,0.9)");
        grad.addColorStop(1, "rgba(80,20,5,0)");
        ptx.fillStyle = grad;
        ptx.fillRect(0, 0, 64, 64);
        fireSystem.particleTexture.update();

        fireSystem.emitter = meteor;
        fireSystem.minEmitBox = new BABYLON.Vector3(-0.5, -0.5, -0.5);
        fireSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);

        fireSystem.color1 = new BABYLON.Color4(1, 0.92, 0.5, 1);
        fireSystem.color2 = new BABYLON.Color4(1, 0.6, 0.15, 0.9);
        fireSystem.colorDead = new BABYLON.Color4(0.25, 0.08, 0.02, 0);

        fireSystem.minSize = 0.4;
        fireSystem.maxSize = 1.3;
        fireSystem.minLifeTime = 0.4;
        fireSystem.maxLifeTime = 1.2;
        fireSystem.emitRate = 220;
        fireSystem.gravity = new BABYLON.Vector3(0, -7, 0);
        fireSystem.direction1 = new BABYLON.Vector3(-2, -7, -1);
        fireSystem.direction2 = new BABYLON.Vector3(2, -7, 1);
        fireSystem.minAngularSpeed = -2;
        fireSystem.maxAngularSpeed = 2;
        fireSystem.minPower = 1.6;
        fireSystem.maxPower = 4;

        fireSystem.start();

        const baseSpeed = 0.25 + Math.random() * 0.2;
        meteoritos.push({ mesh: meteor, particles: fireSystem, speed: baseSpeed });
    };

    // Crear meteoritos iniciales
    for (let i = 0; i < 14; i++) {
        createMeteor();
    }

    let meteorCount = 0;

    // Loop de actualización
    scene.onBeforeRenderObservable.add(() => {
        // Movimiento del jugador: W avanza hacia donde mira la cámara
        const forward = camera.getDirection(BABYLON.Axis.Z);
        const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, forward).normalize();
        const up = BABYLON.Axis.Y;

        let moveDirection = new BABYLON.Vector3(0, 0, 0);
        if (keys.w) moveDirection.addInPlace(forward); // Avanzar hacia donde mira
        if (keys.s) moveDirection.subtractInPlace(forward); // Retroceder
        if (keys.a) moveDirection.subtractInPlace(right); // Izquierda
        if (keys.d) moveDirection.addInPlace(right); // Derecha

        const speed = keys.space ? playerData.speed * 1.8 : playerData.speed;
        
        if (moveDirection.length() > 0) {
            moveDirection = moveDirection.normalize().scale(speed);
        }

        // Aplicar movimiento
        playerData.mesh.position.addInPlace(moveDirection);

        // Limitar el movimiento en el espacio (más bajo, menos vuelo)
        playerData.mesh.position.x = BABYLON.Scalar.Clamp(playerData.mesh.position.x, -100, 100);
        playerData.mesh.position.y = BABYLON.Scalar.Clamp(playerData.mesh.position.y, 2, 25);
        playerData.mesh.position.z = BABYLON.Scalar.Clamp(playerData.mesh.position.z, -100, 100);

        // Rotar el personaje hacia la dirección del movimiento
        if (moveDirection.length() > 0) {
            const angle = Math.atan2(moveDirection.x, moveDirection.y);
            playerData.mesh.rotation.z += (angle - playerData.mesh.rotation.z) * 0.1;
        }

        // Actualizar nubes (desplazamiento lento)
        clouds.forEach((cloud, idx) => {
            cloud.position.x += 0.01 * (idx % 2 === 0 ? 1 : -1);
            if (cloud.position.x > 200) cloud.position.x = -200;
            if (cloud.position.x < -200) cloud.position.x = 200;
        });

        // Actualizar meteoritos
        meteoritos.forEach((meteor, index) => {
            // Movimiento diagonal hacia abajo y hacia el jugador
            meteor.mesh.position.z -= meteor.speed * 0.6; // Hacia adelante
            meteor.mesh.position.y -= meteor.speed * 0.4; // Caída
            meteor.mesh.position.x += meteor.speed * 0.2 * (index % 2 === 0 ? 1 : -1); // Deriva lateral
            meteor.mesh.rotation.x += 0.01;
            meteor.mesh.rotation.y += 0.015;

            // Regenerar meteorito si se va muy lejos o muy bajo
            if (meteor.mesh.position.z < -60 || meteor.mesh.position.y < 0) {
                meteor.mesh.position.x = (Math.random() - 0.5) * 100;
                meteor.mesh.position.y = Math.random() * 50 + 60; // Más alto (60-110)
                meteor.mesh.position.z = Math.random() * 100 + 60;
                meteor.speed = 0.25 + Math.random() * 0.2;
                meteorCount++;
            }

            // Detectar colisión simple
            const distance = BABYLON.Vector3.Distance(playerData.mesh.position, meteor.mesh.position);
            if (distance < 4) {
                meteor.mesh.position.x = (Math.random() - 0.5) * 100;
                meteor.mesh.position.y = Math.random() * 50 + 60; // Más alto (60-110)
                meteor.mesh.position.z = Math.random() * 100 + 60;
                meteor.speed = 0.25 + Math.random() * 0.2;
                meteorCount++;
            }
        });

        // Actualizar UI
        document.getElementById("meteorCount").textContent = meteorCount;
        document.getElementById("posX").textContent = playerData.mesh.position.x.toFixed(1);
        document.getElementById("posY").textContent = playerData.mesh.position.y.toFixed(1);
        document.getElementById("posZ").textContent = playerData.mesh.position.z.toFixed(1);

        // Actualizar cámara orbital siguiendo al jugador
        const camTarget = playerData.mesh.position.add(new BABYLON.Vector3(0, 1, 0));
        camera.setTarget(camTarget);
        camera.radius = BABYLON.Scalar.Clamp(camera.radius, 8, 18);
    });

    return scene;
};

// Crear escena
const scene = createScene();

// Manejo de redimensionamiento
window.addEventListener("resize", function () {
    engine.resize();
});

// Loop principal
engine.runRenderLoop(function () {
    scene.render();
});
