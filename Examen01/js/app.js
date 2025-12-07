// Babylon.js escena principal para el juego de recogida y entrega del alquimista
console.log("Cargando juego...");
const canvas = document.getElementById("renderCanvas");
console.log("Canvas:", canvas);
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
console.log("Engine creado:", engine);

// Estado de entrada del teclado
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    interactQueued: false,
    running: false
};

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || e.code === "ArrowUp") keys.forward = true;
    if (k === "s" || e.code === "ArrowDown") keys.backward = true;
    if (k === "a" || e.code === "ArrowLeft") keys.left = true;
    if (k === "d" || e.code === "ArrowRight") keys.right = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.running = true;
    if (k === "e" || e.code === " " || e.code === "Space") {
        keys.interactQueued = true;
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || e.code === "ArrowUp") keys.forward = false;
    if (k === "s" || e.code === "ArrowDown") keys.backward = false;
    if (k === "a" || e.code === "ArrowLeft") keys.left = false;
    if (k === "d" || e.code === "ArrowRight") keys.right = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.running = false;
});

// Referencias al HUD
const hud = {
    carry: document.getElementById("carryCount"),
    delivered: document.getElementById("deliveredCount"),
    status: document.getElementById("status")
};

// Estado del juego
const gameState = {
    pickupZone: null,
    deliveryZone: null,
    player: null,
    carryAnchor: null,
    carried: [],
    delivered: 0,
    pickups: [],
    capacity: 3,
    templates: {},
    animations: {
        groups: [],
        moving: false,
        skeleton: null,
        skeletonRange: null,
        skeletonIdleRange: null,
        skeletonAnim: null,
        scene: null,
        walkGroup: null,
        idleGroup: null,
        skeletonCurrent: "walk"
    }
};

const updateHud = (message) => {
    hud.carry.textContent = gameState.carried.length;
    hud.delivered.textContent = gameState.delivered;
    if (message) {
        hud.status.textContent = message;
    }
};
// Comprueba si el jugador está dentro de una zona (radio).
const isInsideZone = (position, zone) => {
    return BABYLON.Vector3.Distance(new BABYLON.Vector3(position.x, 0, position.z), new BABYLON.Vector3(zone.center.x, 0, zone.center.z)) <= zone.radius;
};

//Genera puntos aleatorios dentro de la zona de pickups.
const randomPointInZone = (zone) => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * zone.radius * 0.75;
    // AJUSTE: Y=1.5 para que los pickups queden visibles sobre el suelo
    return new BABYLON.Vector3(zone.center.x + Math.cos(angle) * r, 1.8, zone.center.z + Math.sin(angle) * r);
};

//Escoge aleatoriamente dónde aparece la zona morada.
// AJUSTE: Distancias para mapa grande (min 30, max 80) con rango amplio de spawn
const choosePickupZone = (deliveryCenter) => {
    const minDistance = 30;
    const maxDistance = 80;
    let center;
    do {
        center = new BABYLON.Vector3((Math.random() - 0.5) * 200, 0, (Math.random() - 0.5) * 200);
    } while (BABYLON.Vector3.Distance(center, deliveryCenter) < minDistance || BABYLON.Vector3.Distance(center, BABYLON.Vector3.Zero()) > maxDistance);
    return center;
};

const createZoneDisc = (scene, name, center, radius, color) => {
    const disc = BABYLON.MeshBuilder.CreateCylinder(name, { height: 0.05, diameter: radius * 2, tessellation: 32 }, scene);
    disc.position = new BABYLON.Vector3(center.x, center.y - 0.02, center.z);
    const mat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
    mat.diffuseColor = color;
    mat.alpha = 0.35;
    disc.material = mat;
    disc.isPickable = false;
    return disc;
};

const addShadowCasters = (shadowGenerator, root) => {
    root.getChildMeshes().forEach((m) => shadowGenerator.addShadowCaster(m));
};

//CARGA Y GESTIÓN DE MODELOS
const loadModel = async (scene, filename, scale = 1, yOffset = 0, rotationX = 0, rotationY = 0, rotationZ = 0) => {
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", filename, scene);
    const root = result.meshes[0];
    root.scaling.scaleInPlace(scale);
    root.position.y += yOffset;
    root.rotation = new BABYLON.Vector3(rotationX, rotationY, rotationZ);
    root.setEnabled(false);
    return root;
};

const clonePickup = (template, name) => {
    const instance = template.clone(name);
    instance.setEnabled(true);
    return instance;
};

const refreshCarryStack = () => {
    const offsets = [
        new BABYLON.Vector3(0, 0.2, 0.8),
        new BABYLON.Vector3(0.35, 0.35, 0.6),
        new BABYLON.Vector3(-0.35, 0.5, 0.6)
    ];
    gameState.carried.forEach((item, idx) => {
        item.mesh.position = offsets[idx] || BABYLON.Vector3.Zero();
        item.mesh.rotationQuaternion = null;
        item.mesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
    });
};

//Crea los cristales/hongos distribuidos por la zona morada.
const spawnPickups = (scene) => {
    const templates = [
        gameState.templates.spheres,
        gameState.templates.mushroom,
        gameState.templates.spheres,
        gameState.templates.mushroom
    ];
    const total = 10;
    for (let i = 0; i < total; i++) {
        const tpl = templates[i % templates.length];
        if (!tpl) continue;
        const mesh = clonePickup(tpl, `pickup_${i}`);
        mesh.position = randomPointInZone(gameState.pickupZone);
        mesh.rotationQuaternion = null;
        mesh.rotation = new BABYLON.Vector3(0, Math.random() * Math.PI * 2, 0);
        gameState.pickups.push({ mesh, collected: false, delivered: false });
    }
};

//Detecta si hay un objeto cerca del jugador (<2.5m).
const findNearbyPickup = (playerPos) => {
    let closest = null;
    let minDist = 9999;
    gameState.pickups.forEach((item) => {
        if (item.collected || item.delivered) return;
        const d = BABYLON.Vector3.Distance(playerPos, item.mesh.position);
        if (d < 2.5 && d < minDist) {
            minDist = d;
            closest = item;
        }
    });
    return closest;
};

/*
Cuando entras en la zona verde:
-suelta los objetos ahí
- suma al contador de entregados
*/
const deliverItems = () => {
    if (gameState.carried.length === 0) {
        updateHud("No llevas nada que entregar.");
        return;
    }
    if (!isInsideZone(gameState.player.position, gameState.deliveryZone)) {
        updateHud("Acércate a la zona verde para entregar.");
        return;
    }
    const base = gameState.deliveryZone.center;
    gameState.carried.forEach((item) => {
        item.mesh.setParent(null);
        item.mesh.position = new BABYLON.Vector3(
            base.x + (Math.random() - 0.5) * 2.5,
            0.25,
            base.z + (Math.random() - 0.5) * 2.5
        );
        item.mesh.rotationQuaternion = null;
        item.mesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
        item.delivered = true;
    });
    gameState.delivered += gameState.carried.length;
    gameState.carried = [];
    updateHud("Objetos entregados. Regresa por más ingredientes.");
};

const tryPickup = () => {
    if (gameState.carried.length >= gameState.capacity) {
        updateHud("Límite de 3 objetos. Entrega antes de recoger más.");
        return;
    }
    const item = findNearbyPickup(gameState.player.position);
    if (!item) {
        updateHud("Acércate a un objeto en la zona morada y presiona E.");
        return;
    }
    item.collected = true;
    item.mesh.setParent(gameState.carryAnchor);
    item.mesh.position = BABYLON.Vector3.Zero();
    item.mesh.rotationQuaternion = null;
    item.mesh.rotation = new BABYLON.Vector3(Math.PI, 0, 0);
    gameState.carried.push(item);
    refreshCarryStack();
    updateHud("Recogiste un ingrediente. Llévalo a la mesa (zona verde).");
};

const handleInteract = () => {
    if (isInsideZone(gameState.player.position, gameState.deliveryZone) && gameState.carried.length > 0) {
        deliverItems();
    } else {
        tryPickup();
    }
};

//Animacion del jugador (caminando/idle)
const setPlayerAnimation = (moving) => {
    if (gameState.animations.moving === moving) return;
    gameState.animations.moving = moving;

    // Prioridad: animationGroups si existen
    if (gameState.animations.groups.length) {
        const playGroup = moving ? (gameState.animations.walkGroup || gameState.animations.groups[0]) : (gameState.animations.idleGroup || gameState.animations.walkGroup || gameState.animations.groups[0]);
        gameState.animations.groups.forEach((g) => {
            if (g === playGroup) {
                g.speedRatio = moving ? 1.2 : 0.6;
                if (!g.isPlaying) g.start(true);
                else g.play(true);
            } else if (g.isPlaying) {
                g.stop();
            }
        });
        return;
    }

    // Fallback: animación de esqueleto si existe
    const skeleton = gameState.animations.skeleton;
    const scene = gameState.animations.scene;
    if (!skeleton || !scene) return;

    // Asegurar rangos walk/idle
    if (!gameState.animations.skeletonRange || !gameState.animations.skeletonIdleRange) {
        const findRange = (names) => {
            let r = null;
            names.forEach((n) => {
                if (!r) r = skeleton.getAnimationRange(n);
            });
            return r ? { from: r.from, to: r.to } : null;
        };
        gameState.animations.skeletonRange = findRange(["Walk", "walk", "WalkCycle", "Run", "run"]) || { from: 0, to: 100 };
        gameState.animations.skeletonIdleRange = findRange(["Idle", "idle", "Rest", "rest"]) || gameState.animations.skeletonRange;
    }

    const walkRange = gameState.animations.skeletonRange;
    const idleRange = gameState.animations.skeletonIdleRange;
    const targetRange = moving ? walkRange : idleRange;
    const targetName = moving ? "walk" : "idle";

    // Si ya existe animación y es el mismo rango, solo ajustar velocidad
    if (gameState.animations.skeletonAnim && gameState.animations.skeletonCurrent === targetName) {
        gameState.animations.skeletonAnim.speedRatio = moving ? 1.1 : 0.4;
        gameState.animations.skeletonAnim.play();
        return;
    }

    // Reiniciar solo si cambiamos de rango
    if (gameState.animations.skeletonAnim) {
        gameState.animations.skeletonAnim.stop();
    }
    gameState.animations.skeletonCurrent = targetName;
    gameState.animations.skeletonAnim = scene.beginAnimation(skeleton, targetRange.from, targetRange.to, true, moving ? 1.1 : 0.4);
};

const createScene = async () => {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.04, 0.06, 0.1);
    scene.collisionsEnabled = true;

    // Luces y sombras
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.2, 1, 0.2), scene);
    hemi.intensity = 0.9;
    const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.25, -1, 0.35), scene);
    dir.position = new BABYLON.Vector3(20, 40, -20);
    dir.intensity = 0.85;
    const shadows = new BABYLON.ShadowGenerator(2048, dir);
    shadows.usePoissonSampling = true;

 

    // Skybox ampliado a 800 para cubrir el mapa grande de 320×320
    const skybox = BABYLON.MeshBuilder.CreateBox("sky", { size: 320 }, scene);
    const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.diffuseColor = new BABYLON.Color3(0.05, 0.07, 0.12);
    skyMat.emissiveColor = new BABYLON.Color3(0.05, 0.07, 0.12);
    skybox.material = skyMat;

    // Escenario principal - bosque low poly en el centro del mapa
    const forest = await loadModel(scene, "free_low_poly_forest.glb", 1.2, 0);
    forest.setEnabled(true);
    forest.position = new BABYLON.Vector3(-39, 33.5, 5);
    addShadowCasters(shadows, forest);

    // Torre del alquimista como punto de inicio del jugador
    const tower = await loadModel(scene, "the_alchemist_tower.glb", 2, 0);
    tower.setEnabled(true);
    tower.position = new BABYLON.Vector3(-19, -1.6, -19);
    addShadowCasters(shadows, tower);

    // Mesa del alquimista - zona de entrega (ajustada Y para estar sobre el suelo)
    const desk = await loadModel(scene, "cartoon_alchemist_desk.glb", 3, 0);
    desk.setEnabled(true);
    desk.position = new BABYLON.Vector3(-37, 14.5, 32);
    desk.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0);
    addShadowCasters(shadows, desk);

    // Zona de entrega exactamente en X,Y,Z donde está la mesa
    const deliveryCenter = new BABYLON.Vector3(-15, 0, 5);
    const deliveryRadius = 8;
    const pickupCenter = choosePickupZone(deliveryCenter);
    const pickupRadius = 10;
    gameState.deliveryZone = { center: deliveryCenter, radius: deliveryRadius };
    gameState.pickupZone = { center: pickupCenter, radius: pickupRadius };
    createZoneDisc(scene, "deliveryZone", deliveryCenter, deliveryRadius, new BABYLON.Color3(0.3, 0.9, 0.4));
    createZoneDisc(scene, "pickupZone", pickupCenter, pickupRadius, new BABYLON.Color3(0.7, 0.4, 0.9));

    // Flecha grande y llamativa encima de la zona de pickup
    const arrowBase = BABYLON.MeshBuilder.CreateCylinder("arrowBase", { height: 1, diameter: 3, tessellation: 32 }, scene);
    arrowBase.position = new BABYLON.Vector3(pickupCenter.x, 6, pickupCenter.z);
    const arrowBaseMat = new BABYLON.StandardMaterial("arrowBaseMat", scene);
    arrowBaseMat.diffuseColor = new BABYLON.Color3(1, 1, 0);
    arrowBaseMat.emissiveColor = new BABYLON.Color3(1, 1, 0);
    arrowBaseMat.specularColor = new BABYLON.Color3(1, 1, 1);
    arrowBase.material = arrowBaseMat;

    const arrowHead = BABYLON.MeshBuilder.CreateCylinder("arrowHead", { height: 2, diameterTop: 0, diameterBottom: 4.5, tessellation: 32 }, scene);
    arrowHead.position = new BABYLON.Vector3(pickupCenter.x, 8.8, pickupCenter.z);
    const arrowHeadMat = new BABYLON.StandardMaterial("arrowHeadMat", scene);
    arrowHeadMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0);
    arrowHeadMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0);
    arrowHeadMat.specularColor = new BABYLON.Color3(1, 1, 1);
    arrowHead.material = arrowHeadMat;

    // Jugador inicia cerca de la torre del alquimista
    gameState.player = new BABYLON.TransformNode("player", scene);
    gameState.player.position = new BABYLON.Vector3(-58, 20, -26);
    gameState.carryAnchor = new BABYLON.TransformNode("carryAnchor", scene);
    gameState.carryAnchor.parent = gameState.player;
    gameState.carryAnchor.position = new BABYLON.Vector3(0, 0.4, 0.9);

    const playerImport = await BABYLON.SceneLoader.ImportMeshAsync("", "./assets/models/", "fullmetal_alchemist__model.glb", scene);
    const playerModel = playerImport.meshes[0];
    playerModel.checkCollisions = true;
    // Escala del jugador aumentada a 2.0 para que se vea más grande y proporcionado
    playerModel.scaling.scaleInPlace(1.9);
    playerModel.setEnabled(true);
    playerModel.parent = gameState.player;
    playerModel.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    gameState.animations.groups = playerImport.animationGroups || [];
    // Identificar animaciones Walk/Run/Idle
    const isName = (g, list) => g && g.name && list.some((n) => g.name.toLowerCase().includes(n));
    gameState.animations.groups.forEach((g) => {
        g.stop();
        g.loopAnimation = true;
        if (isName(g, ["walk", "run", "move"])) gameState.animations.walkGroup = gameState.animations.walkGroup || g;
        if (isName(g, ["idle", "rest", "breath"])) gameState.animations.idleGroup = gameState.animations.idleGroup || g;
    });
    // Guardar referencia a esqueleto para fallback de animación de caminata
    gameState.animations.skeleton = (playerImport.skeletons && playerImport.skeletons[0]) || null;
    gameState.animations.scene = scene;
    addShadowCasters(shadows, playerModel);

    // Cámara más cercana (radio inicial 10, límites 6–18) para mejor vista del jugador
    const camera = new BABYLON.ArcRotateCamera(
        "orbitCam",
        Math.PI / 1.3,
        Math.PI / 3,
        10,
        gameState.player.position,
        scene
    );
    camera.lowerRadiusLimit = 18;
    camera.upperRadiusLimit = 20;
    camera.wheelPrecision = 25;
    camera.panningSensibility = 0;
    camera.attachControl(canvas, true);

    // Plantillas de pickups
    // Escala aumentada para mejor visibilidad
    gameState.templates.spheres = await loadModel(scene, "cristales.glb", 0.5, 0.02, Math.PI, 0, 0);
    gameState.templates.mushroom = await loadModel(scene, "hongo_fab.glb", 0.02, 0.02, Math.PI, 1, 0);

    spawnPickups(scene);

    let t = 0;
    // Movimiento y lógica por frame
    scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        t += dt;
        // Dirección basada en hacia dónde mira la cámara (mouse)
        const camForward = scene.activeCamera.getDirection(BABYLON.Axis.Z);
        const forward = new BABYLON.Vector3(camForward.x, 0, camForward.z).normalize();
        const right = new BABYLON.Vector3(forward.z, 0, -forward.x);
        let move = BABYLON.Vector3.Zero();
        if (keys.forward) move = move.add(forward);
        if (keys.backward) move = move.subtract(forward);
        if (keys.left) move = move.subtract(right);
        if (keys.right) move = move.add(right);

        const isMoving = move.lengthSquared() > 0.0001;
        if (isMoving) {
            const speed = keys.running ? 16 : 8;
            move = move.normalize().scale(speed * dt);
            gameState.player.position.addInPlace(move);
            const yaw = Math.atan2(move.x, move.z);
            gameState.player.rotation = new BABYLON.Vector3(0, yaw, 0);
        }
        setPlayerAnimation(isMoving);

        // Pequeño vaivén del ancla de carga para dar sensación de movimiento
        const bob = isMoving ? Math.sin(t * 10) * 0.04 : 0;
        gameState.carryAnchor.position.y = 1.4 + bob;

        //Expandido clampRange a 140 para mapa 320×320, libertad total de movimiento
        const clampRange = 140;
        gameState.player.position.x = BABYLON.Scalar.Clamp(gameState.player.position.x, -clampRange, clampRange);
        gameState.player.position.z = BABYLON.Scalar.Clamp(gameState.player.position.z, -clampRange, clampRange);
        gameState.player.position.y = 0;

        // Mantener la cámara apuntando al jugador en cada frame
        scene.activeCamera.target = gameState.player.position.clone();

        if (keys.interactQueued) {
            handleInteract();
            keys.interactQueued = false;
        }
    });

    updateHud("Acércate a la zona morada para recoger ingredientes.");
    return scene;
};

createScene().then((scene) => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});

window.addEventListener("resize", () => {
    engine.resize();
});
