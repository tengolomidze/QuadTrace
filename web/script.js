class Block {
    constructor(x, y, z, type) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.type = type;
    }
}

let blocks = [];
let currentBlockType = 0;
const blockMap = new Map();

let yMin = -64;
let yMax = 320;
let searchRadius = 1000000;
let searchTiles = 4096;
let isSearching = false;

const clearAllBlocks = () => {
    if (blocks.length === 0) return;
    if (!confirm('Are you sure you want to clear all the blocks?')) return;

    blockMap.forEach(({ mesh }) => {
        scene.remove(mesh);
        const idx = objects.indexOf(mesh);
        if (idx !== -1) objects.splice(idx, 1);
    });
    blockMap.clear();
    blocks = [];
};

//STATE SAVE LOGIC
const loadState = () => {
    try {
        const saved = localStorage.getItem('quadtraceState');
        if (saved) {
            const state = JSON.parse(saved);
            blocks = (state.blocks || []).map((b) => new Block(b.x ?? 0, b.y ?? -60, b.z ?? 0, b.type ?? 1));
            yMin = state.yMin ?? -64;
            yMax = state.yMax ?? 320;
            searchRadius = state.searchRadius ?? 1000000;
            searchTiles = state.searchTiles ?? 4096;
        }
    } catch (e) {
        console.error('Failed to load saved state', e);
    }
};
const saveState = () => {
    try {
        localStorage.setItem('quadtraceState', JSON.stringify({ blocks, yMin, yMax, searchRadius, searchTiles }));
    } catch (e) {
        console.error('Failed to save state', e);
    }
};
loadState();


//INPUT SYSTEM
const yMinInput = document.querySelector('.search-yMin');
const yMaxInput = document.querySelector('.search-yMax');
const searchRadiusInput = document.querySelector('.search-radius');
const searchTilesInput = document.querySelector('.search-tiles');
yMinInput.value = yMin;
yMaxInput.value = yMax;
searchRadiusInput.value = searchRadius;
searchTilesInput.value = searchTiles;

setTimeout(() => {
     if (yMinInput) {
        yMinInput.addEventListener('change', () => {
            yMin = parseInt(yMinInput.value) || -64;
            saveState();
        });
    }
    if (yMaxInput) {
        yMaxInput.addEventListener('change', () => {
            yMax = parseInt(yMaxInput.value) || 320;
            saveState();
        });
    }
    if (searchRadiusInput) {
        searchRadiusInput.addEventListener('change', () => {
            searchRadius = parseInt(searchRadiusInput.value) || 1000000;
            saveState();
        });
    }
    if (searchTilesInput) {
        searchTilesInput.addEventListener('change', () => {
            searchTiles = parseInt(searchTilesInput.value) || 4096;
            saveState();
        });
    }
}, 0)
setInterval(saveState, 500)

//BLOCK SELECTOR
const block0 = document.querySelector('.block-0');
const block1 = document.querySelector('.block-1');
const block2 = document.querySelector('.block-2');
const block3 = document.querySelector('.block-3');
const block4 = document.querySelector('.block-4');
const block5 = document.querySelector('.block-5');
setTimeout(() => {
    block0.addEventListener("click", () => {currentBlockType = 0; updateButtonStates()});
    block1.addEventListener("click", () => {currentBlockType = 1; updateButtonStates()});
    block2.addEventListener("click", () => {currentBlockType = 2; updateButtonStates()});
    block3.addEventListener("click", () => {currentBlockType = 3; updateButtonStates()});
    block4.addEventListener("click", () => {currentBlockType = 4; updateButtonStates()});
    block5.addEventListener("click", () => {currentBlockType = 5; updateButtonStates()});
}, 0)

const updateButtonStates = () => {
    block0.classList.remove('active');
    block1.classList.remove('active');
    block2.classList.remove('active');
    block3.classList.remove('active');
    block4.classList.remove('active');
    block5.classList.remove('active');

    if (currentBlockType === 0) block0.classList.add('active');
    else if (currentBlockType === 1) block1.classList.add('active');
    else if (currentBlockType === 2) block2.classList.add('active');
    else if (currentBlockType === 3) block3.classList.add('active');
    else if (currentBlockType === 4) block4.classList.add('active');
    else if (currentBlockType === 5) block5.classList.add('active');
};
window.addEventListener("keyup", function (e) {
    if (e.code === "KeyW")
        currentBlockType = 0;
    if (e.code === "KeyD")
        currentBlockType = 1;
    if (e.code === "KeyS")
        currentBlockType = 2;
    if (e.code === "KeyA")
        currentBlockType = 3;
    if (e.code === "KeyE")
        currentBlockType = 4;
    if (e.code === "KeyQ")
        currentBlockType = 5;
    updateButtonStates()
});

updateButtonStates()

// SEARCH AND CONSOLE LOGIC
let socket = null;
const consoleOutput = document.querySelector('.console-output');
const progressSection = document.querySelector('.progress-section');
const progressFill = document.querySelector('.progress-bar-fill');
const progressText = document.querySelector('.progress-text');
const searchBtn = document.querySelector('.search-btn');
const stopBtn = document.querySelector('.stop-btn');

const resetProgress = () => {
    if (progressSection) progressSection.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
};
const formatCompactNumber = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) return `${(value / 1e12).toFixed(absValue >= 1e13 ? 0 : 1)}T`;
    if (absValue >= 1e9) return `${(value / 1e9).toFixed(absValue >= 1e10 ? 0 : 1)}B`;
    if (absValue >= 1e6) return `${(value / 1e6).toFixed(absValue >= 1e7 ? 0 : 1)}M`;
    if (absValue >= 1e3) return `${(value / 1e3).toFixed(absValue >= 1e4 ? 0 : 1)}K`;
    return `${value}`;
};
const updateProgress = (message) => {
    const match = message.match(/progress:\s*(\d+)\s*\/\s*(\d+)/i);
    if (!match) return;

    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (!total) return;

    const percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    if (progressSection) progressSection.style.display = 'flex';
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}% (${formatCompactNumber(current)}/${formatCompactNumber(total)})`;
};
const consoleLog = (message, type = 'normal') => {
    const line = document.createElement('div');
    line.className = `log-line ${type === 'error' ? 'log-error' : type === 'success' ? 'log-success' : ''}`;
    line.textContent = message;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
};
const disableControls = () => {
    const controls = document.querySelectorAll('.block, .clear-all, .rotate-left, .rotate-right, .search-yMin, .search-yMax, .search-radius, .search-tiles');
    controls.forEach(ctrl => ctrl.disabled = true);
    isSearching = true;
    if (searchBtn) searchBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
};
const enableControls = () => {
    const controls = document.querySelectorAll('.block, .clear-all, .rotate-left, .rotate-right, .search-yMin, .search-yMax, .search-radius, .search-tiles');
    controls.forEach(ctrl => ctrl.disabled = false);
    isSearching = false;
    if (searchBtn) searchBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
};
const connectSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) return socket;

    socket = new WebSocket('ws://127.0.0.1:8001');
    socket.addEventListener('open', () => consoleLog('Connected to server', 'success'));
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
            updateProgress(message.data);
            if(!message.data.includes("progress"))
                consoleLog(message.data, 'normal');
        } else if (message.type === 'started') {
            consoleLog('Process started', 'success');
        } else if (message.type === 'done') {
            consoleLog(`Process finished with exit code ${message.code}`, 'success');
            enableControls();
        } else if (message.type === 'stopped') {
            consoleLog(message.message, 'normal');
            enableControls();
        } else if (message.type === 'error') {
            consoleLog(message.message, 'error');
            enableControls();
        }
    });
    socket.addEventListener('close', () => {
        consoleLog('Disconnected from server', 'error');
        enableControls();
    });
    return socket;
};
const stopSearch = () => {
    if (!isSearching) return;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'stop' }));
    }
};
const performSearch = () => {
    if (isSearching) return;

    if (blocks.length === 0) {
        consoleLog('Place at least one block before searching', 'error');
        return;
    }

    const ws = connectSocket();
    disableControls();
    consoleOutput.innerHTML = '';
    resetProgress();

    const payload = {
        action: 'run',
        xMin: -searchRadius,
        xMax: searchRadius,
        yMin: yMin,
        yMax: yMax,
        zMin: -searchRadius,
        zMax: searchRadius,
        tile: searchTiles,
        patterns: blocks.map((b) => {
            return {dx: b.x - blocks[0].x, dy: b.y - blocks[0].y, dz: b.z - blocks[0].z, expected: b.type}
        }),
    };

    if (ws.readyState === WebSocket.OPEN) 
        ws.send(JSON.stringify(payload));
    else {
        ws.addEventListener('open', () => {
            ws.send(JSON.stringify(payload));
        }, { once: true });
    }
};
setTimeout(() => {
    if (searchBtn) 
        searchBtn.addEventListener('click', performSearch);
    if (stopBtn) 
        stopBtn.addEventListener('click', stopSearch);
}, 0);

let bestRadiusSpan = document.querySelector(".best-radius");
const calculatebestRadius = () => {
    let p = 1;
    blocks.forEach(block => {
        p *= (block.type < 4 ? 0.25 : 0.5)
    })

    let volume = 1/p;
    bestRadiusSpan.textContent = Math.round(Math.sqrt(volume/382)/10)*10/2;
}

const gameWrapper = document.querySelector('.game-wrapper');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, gameWrapper.clientWidth / gameWrapper.clientHeight, 1, 10000);
camera.position.set(10, 15, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(gameWrapper.clientWidth, gameWrapper.clientHeight);
gameWrapper.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

const gridHelper = new THREE.GridHelper(20, 20);
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.35;
scene.add(gridHelper);

const objects = []; 
const planeGeo = new THREE.PlaneGeometry(100, 100);
planeGeo.rotateX(-Math.PI / 2);
const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
scene.add(plane);
objects.push(plane);

const loader = new THREE.TextureLoader();
const forwardTexture = loader.load("img/forward.png");
const rightTexture = loader.load("img/right.png");
const backwardsTexture = loader.load("img/backwards.png");
const leftTexture = loader.load("img/left.png");
const blueTexture = loader.load("img/blue.png");

const mirroredTexture = loader.load("img/mirrored.png");
const notMirroredTexture = loader.load("img/not_mirrored.png");
const greenTexture = loader.load("img/green.png");

const blockTypeMaterials = {
    0: [
        new THREE.MeshLambertMaterial({ map: blueTexture }), // +X
        new THREE.MeshLambertMaterial({ map: blueTexture }), // -X
        new THREE.MeshLambertMaterial({ map: forwardTexture }), // +Y
        new THREE.MeshLambertMaterial({ map: forwardTexture }), // -Y
        new THREE.MeshLambertMaterial({ map: blueTexture }), // +Z
        new THREE.MeshLambertMaterial({ map: blueTexture })  // -Z
    ],
    1: [
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: rightTexture }),
        new THREE.MeshLambertMaterial({ map: rightTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture })
    ],
    2: [
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: backwardsTexture }),
        new THREE.MeshLambertMaterial({ map: backwardsTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture })
    ],
    3: [
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: leftTexture }),
        new THREE.MeshLambertMaterial({ map: leftTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture }),
        new THREE.MeshLambertMaterial({ map: blueTexture })
    ],
    4: [
        new THREE.MeshLambertMaterial({ map: notMirroredTexture }),
        new THREE.MeshLambertMaterial({ map: notMirroredTexture }),
        new THREE.MeshLambertMaterial({ map: greenTexture }),
        new THREE.MeshLambertMaterial({ map: greenTexture }),
        new THREE.MeshLambertMaterial({ map: notMirroredTexture }),
        new THREE.MeshLambertMaterial({ map: notMirroredTexture })
    ],
    5: [
        new THREE.MeshLambertMaterial({ map: mirroredTexture }), // +X
        new THREE.MeshLambertMaterial({ map: mirroredTexture }), // -X
        new THREE.MeshLambertMaterial({ map: greenTexture }), // +Y
        new THREE.MeshLambertMaterial({ map: greenTexture }), // -Y
        new THREE.MeshLambertMaterial({ map: mirroredTexture }), // +Z
        new THREE.MeshLambertMaterial({ map: mirroredTexture })  // -Z
    ],
};
const blockGeo = new THREE.BoxGeometry(1, 1, 1);
const blockEdgesGeo = new THREE.EdgesGeometry(blockGeo);
const edgeLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
const addEdgeLines = (mesh) => {
    const edges = new THREE.LineSegments(blockEdgesGeo, edgeLineMaterial);
    mesh.add(edges);
};

const worldKey = (x, y, z) => `${x},${y},${z}`;

const rebuildBlocksInScene = () => {
    blocks.forEach((b) => {
        const material = blockTypeMaterials[b.type] || blockTypeMaterials[1];
        const voxel = new THREE.Mesh(blockGeo, material);
        voxel.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
        addEdgeLines(voxel);
        scene.add(voxel);
        objects.push(voxel);
        blockMap.set(worldKey(b.x, b.y, b.z), { mesh: voxel, block: b });
    });
};

const rerenderAllBlocks = () => {
    blockMap.forEach(({ mesh }) => {
        scene.remove(mesh);
        const idx = objects.indexOf(mesh);
        if (idx !== -1) objects.splice(idx, 1);
    });
    blockMap.clear();
    rebuildBlocksInScene();
};

const rotateBlocks = (direction) => {
    if (blocks.length === 0) return;
    const pivot = blocks[0];
    blocks.forEach((b) => {
        const dx = b.x - pivot.x;
        const dz = b.z - pivot.z;
        if (direction === 'left') {
            b.x = pivot.x + dz;
            b.z = pivot.z - dx;
            if(b.type >= 0 && b.type <= 3){
                b.type--
                if(b.type === -1){
                    b.type = 3;
                }
            }
        } else {
            b.x = pivot.x - dz;
            b.z = pivot.z + dx;
            if(b.type >= 0 && b.type <= 3){
                b.type++
                if(b.type === 4){
                    b.type = 0;
                }
            }
        }
    });
    rerenderAllBlocks();
};

const rollOverGeo = new THREE.BoxGeometry(1, 1, 1);
const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.25, transparent: true });
const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
rollOverMesh.position.set(0, 0, 20000000);
scene.add(rollOverMesh);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isShiftDown = false;

gameWrapper.addEventListener('mousemove', (event) => {
    const rect = gameWrapper.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / gameWrapper.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / gameWrapper.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        rollOverMesh.position.copy(intersect.point).addScaledVector(intersect.face.normal, 0.5);
        rollOverMesh.position.floor().addScalar(0.5);
    }
});

let isDragging = false;
let startX = 0, startY = 0;

gameWrapper.addEventListener('pointerdown', (event) => {
    isDragging = false;
    startX = event.clientX;
    startY = event.clientY;
});

gameWrapper.addEventListener('pointermove', (event) => {
    if (Math.abs(event.clientX - startX) > 5 || Math.abs(event.clientY - startY) > 5) {
        isDragging = true;
    }
});

gameWrapper.addEventListener('pointerup', (event) => {
    if (event.button !== 0 || isDragging) return;
    if(isSearching) return

    const rect = gameWrapper.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / gameWrapper.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / gameWrapper.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const intersect = intersects[0];

        if (isShiftDown) {
            if (intersect.object !== plane) {
                const meshPos = intersect.object.position;
                const key = worldKey(Math.floor(meshPos.x), Math.floor(meshPos.y), Math.floor(meshPos.z));

                scene.remove(intersect.object);
                objects.splice(objects.indexOf(intersect.object), 1);

                if (blockMap.has(key)) {
                    const entry = blockMap.get(key);
                    const idx = blocks.indexOf(entry.block);
                    if (idx !== -1) blocks.splice(idx, 1);
                    blockMap.delete(key);
                }
            }
        } else {
            const pos = intersect.point.clone().addScaledVector(intersect.face.normal, 0.5).floor();
            const key = worldKey(pos.x, pos.y, pos.z);
            if (blockMap.has(key)) return;

            const voxel = new THREE.Mesh(blockGeo, blockTypeMaterials[currentBlockType]);
            voxel.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
            addEdgeLines(voxel);
            scene.add(voxel);
            objects.push(voxel);

            const block = new Block(pos.x, pos.y, pos.z, currentBlockType);
            blocks.push(block);
            blockMap.set(key, { mesh: voxel, block });
        }
    }

    calculatebestRadius()
});

window.addEventListener('keydown', (event) => { if (event.key === 'Shift') isShiftDown = true; });
window.addEventListener('keyup', (event) => { if (event.key === 'Shift') isShiftDown = false; });
rebuildBlocksInScene();

const blockTypeButtons = {
    1: document.querySelector('.bedrock'),
};
const setActiveBlockType = (type) => {
    currentBlockType = type;
    Object.entries(blockTypeButtons).forEach(([t, btn]) => {
        if (btn) btn.classList.toggle('active', parseInt(t) === type);
    });
};
Object.entries(blockTypeButtons).forEach(([t, btn]) => {
    if (btn) btn.addEventListener('click', () => setActiveBlockType(parseInt(t)));
});
setActiveBlockType(currentBlockType);

const clearAllBtn = document.querySelector('.clear-all');
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllBlocks);

const rotateLeftBtn = document.querySelector('.rotate-left');
const rotateRightBtn = document.querySelector('.rotate-right');
if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => rotateBlocks('left'));
if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => rotateBlocks('right'));

const compassContainer = document.querySelector('.compass-div');
const compassScene = new THREE.Scene();

const compassCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

const compassRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
compassRenderer.setSize(150, 150);
compassContainer.appendChild(compassRenderer.domElement);

function createTextSprite(message, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    
    context.font = "Bold 40px Arial";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.5, 1.5, 1.5);
    return sprite;
}

const compassGroup = new THREE.Group();

const axisColors = {
    x: '#ff3333',
    y: '#33cc33',
    z: '#3366ff',
};
const axisLineMats = {
    x: new THREE.LineBasicMaterial({ color: axisColors.x }),
    y: new THREE.LineBasicMaterial({ color: axisColors.y }),
    z: new THREE.LineBasicMaterial({ color: axisColors.z }),
};

const addCompassAxis = (axis, direction, label) => {
    const dir = new THREE.Vector3(
        axis === 'x' ? direction : 0,
        axis === 'y' ? direction : 0,
        axis === 'z' ? direction : 0
    );
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(0.7)]);
    compassGroup.add(new THREE.Line(lineGeo, axisLineMats[axis]));

    const sprite = createTextSprite(label, axisColors[axis]);
    sprite.position.copy(dir.clone().multiplyScalar(1));
    compassGroup.add(sprite);
};

addCompassAxis('x', 1, 'X');
addCompassAxis('x', -1, '-X');
addCompassAxis('y', 1, 'Y');
addCompassAxis('y', -1, '-Y');
addCompassAxis('z', 1, 'Z');
addCompassAxis('z', -1, '-Z');

compassScene.add(compassGroup);


const GRID_MIN_OPACITY = 0.05;
const GRID_MAX_OPACITY = 0.35;

function updateGridTransparency() {
    const dist = camera.position.length();
    if (dist === 0) return;
    const elevation = Math.asin(THREE.MathUtils.clamp(Math.abs(camera.position.y) / dist, -1, 1));
    const t = Math.sin(elevation);
    gridHelper.material.opacity = THREE.MathUtils.lerp(GRID_MIN_OPACITY, GRID_MAX_OPACITY, t);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    compassCamera.position.copy(camera.position);
    compassCamera.position.setLength(6); 
    compassCamera.lookAt(compassScene.position);

    updateGridTransparency();

    renderer.render(scene, camera);
    compassRenderer.render(compassScene, compassCamera);
}

window.addEventListener('resize', () => {
    const width = gameWrapper.clientWidth;
    const height = gameWrapper.clientHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
animate();