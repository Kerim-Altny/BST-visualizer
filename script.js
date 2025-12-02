const canvas = document.getElementById('bstCanvas');
const ctx = canvas.getContext('2d');
const outputContent = document.getElementById('outputContent');
const outputPanel = document.querySelector('.output-panel');
const outputLabel = document.getElementById('outputLabel');
const statHeight = document.getElementById('statHeight');
const statTotal = document.getElementById('statTotal');
const statLeaves = document.getElementById('statLeaves');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const NODE_RADIUS = 20;
const NODE_COLOR = '#FF9F1C';
const HIGHLIGHT_COLOR = '#00FF00'; // Green for search path
const TRAVERSE_COLOR = '#39FF14'; // Neon Green for travelsals
const TEXT_COLOR = '#FFFFFF';

// Step Mode Logic
let isStepMode = false;
let resolveStep = null;
const nextStepBtn = document.getElementById('nextStepBtn');
const treeTypeSelect = document.getElementById('treeType');
const rotationMessage = document.getElementById('rotationMessage');

let treeType = 'BST'; // 'BST' or 'AVL'

// Helper for delays/steps
const waitStep = async (ms = 500) => {
    if (isStepMode) {
        nextStepBtn.disabled = false;
        await new Promise(resolve => resolveStep = resolve);
        nextStepBtn.disabled = true;
    } else {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
};

class Node {
    constructor(value, x, y) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.highlightColor = null;
        this.arrowType = null; // 'pre', 'in', 'post'
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, NODE_RADIUS, 0, Math.PI * 2);

        if (this.highlightColor) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.highlightColor;
        }

        ctx.fillStyle = this.highlightColor || NODE_COLOR;
        ctx.fill();

        ctx.shadowBlur = 0; // Reset
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = TEXT_COLOR;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.value, this.x, this.y);

        if (this.arrowType) {
            this.drawArrow(ctx);
        }
    }

    drawArrow(ctx) {
        ctx.fillStyle = '#00F5FF'; // Neon Cyan
        ctx.beginPath();
        const size = 12;
        const offset = NODE_RADIUS + 5;

        if (this.arrowType === 'pre') {
            // Left side pointing right (towards node)
            ctx.moveTo(this.x - offset - size, this.y - size / 2);
            ctx.lineTo(this.x - offset, this.y);
            ctx.lineTo(this.x - offset - size, this.y + size / 2);
        } else if (this.arrowType === 'in') {
            // Bottom side pointing up (towards node)
            ctx.moveTo(this.x - size / 2, this.y + offset + size);
            ctx.lineTo(this.x, this.y + offset);
            ctx.lineTo(this.x + size / 2, this.y + offset + size);
        } else if (this.arrowType === 'post') {
            // Right side pointing left (towards node)
            ctx.moveTo(this.x + offset + size, this.y - size / 2);
            ctx.lineTo(this.x + offset, this.y);
            ctx.lineTo(this.x + offset + size, this.y + size / 2);
        }
        ctx.fill();
    }
}

class Tree {
    constructor() {
        this.root = null;
        this.droppingNode = null;
    }

    async insert(value) {
        if (isNaN(value)) return;

        // Determine drop target
        let targetX = canvas.width / 2;
        let targetY = 60;
        if (this.root) {
            targetX = this.root.x;
            targetY = this.root.y;
        }

        // Sky Drop Animation
        await this.animateDrop(value, targetX, targetY);

        if (!this.root) {
            this.root = new Node(value, canvas.width / 2, 60);
        } else {
            if (treeType === 'BST') {
                this.insertNode(this.root, value);
            } else {
                this.root = await this.insertAVL(this.root, value);
            }
        }
        this.updatePositions();
        this.updateStats();
    }

    async animateDrop(value, targetX, targetY) {
        this.droppingNode = new Node(value, targetX, -50);
        this.droppingNode.targetY = targetY;

        // Wait until it's close enough
        while (Math.abs(this.droppingNode.y - targetY) > 5) {
            await waitStep(16);
        }
        this.droppingNode = null;
    }

    insertNode(node, value) {
        if (value < node.value) {
            if (node.left === null) {
                node.left = new Node(value, node.x, node.y);
            } else {
                this.insertNode(node.left, value);
            }
        } else {
            if (node.right === null) {
                node.right = new Node(value, node.x, node.y);
            } else {
                this.insertNode(node.right, value);
            }
        }
    }

    async insertAVL(node, value) {
        if (!node) return new Node(value, node ? node.x : canvas.width / 2, node ? node.y : 60);

        if (value < node.value) {
            node.left = await this.insertAVL(node.left, value);
        } else if (value > node.value) {
            node.right = await this.insertAVL(node.right, value);
        } else {
            return node; // Duplicate
        }

        // Removed updatePositions from here to prevent coordinate loss during recursion

        const balance = this.getBalance(node);

        // Left Left
        if (balance > 1 && value < node.left.value) {
            this.updatePositions(); // Show new node/imbalance
            await this.showRotationMessage(node, "Right Rotation");
            return this.rotateRight(node);
        }
        // Right Right
        if (balance < -1 && value > node.right.value) {
            this.updatePositions(); // Show new node/imbalance
            await this.showRotationMessage(node, "Left Rotation");
            return this.rotateLeft(node);
        }
        // Left Right
        if (balance > 1 && value > node.left.value) {
            this.updatePositions(); // Show new node/imbalance
            await this.showRotationMessage(node.left, "Left Rotation (LR)");
            node.left = this.rotateLeft(node.left);
            this.updatePositions(); // Show intermediate state
            await this.showRotationMessage(node, "Right Rotation (LR)");
            return this.rotateRight(node);
        }
        // Right Left
        if (balance < -1 && value < node.right.value) {
            this.updatePositions(); // Show new node/imbalance
            await this.showRotationMessage(node.right, "Right Rotation (RL)");
            node.right = this.rotateRight(node.right);
            this.updatePositions(); // Show intermediate state
            await this.showRotationMessage(node, "Left Rotation (RL)");
            return this.rotateLeft(node);
        }

        return node;
    }

    async delete(value) {
        if (treeType === 'BST') {
            this.root = this.deleteNode(this.root, value);
        } else {
            this.root = await this.deleteAVL(this.root, value);
        }
        this.updatePositions();
        this.updateStats();
    }

    async deleteAVL(node, key) {
        if (!node) return node;

        if (key < node.value) {
            node.left = await this.deleteAVL(node.left, key);
        } else if (key > node.value) {
            node.right = await this.deleteAVL(node.right, key);
        } else {
            if (!node.left || !node.right) {
                let temp = node.left ? node.left : node.right;
                if (!temp) {
                    temp = node;
                    node = null;
                } else {
                    node = temp;
                }
            } else {
                let temp = this.findMin(node.right);
                node.value = temp.value;
                node.right = await this.deleteAVL(node.right, temp.value);
            }
        }

        if (!node) return node;

        // Removed updatePositions from here

        const balance = this.getBalance(node);

        // Left Left
        if (balance > 1 && this.getBalance(node.left) >= 0) {
            this.updatePositions();
            await this.showRotationMessage(node, "Right Rotation");
            return this.rotateRight(node);
        }
        // Left Right
        if (balance > 1 && this.getBalance(node.left) < 0) {
            this.updatePositions();
            await this.showRotationMessage(node.left, "Left Rotation");
            node.left = this.rotateLeft(node.left);
            this.updatePositions();
            await this.showRotationMessage(node, "Right Rotation");
            return this.rotateRight(node);
        }
        // Right Right
        if (balance < -1 && this.getBalance(node.right) <= 0) {
            this.updatePositions();
            await this.showRotationMessage(node, "Left Rotation");
            return this.rotateLeft(node);
        }
        // Right Left
        if (balance < -1 && this.getBalance(node.right) > 0) {
            this.updatePositions();
            await this.showRotationMessage(node.right, "Right Rotation");
            node.right = this.rotateRight(node.right);
            this.updatePositions();
            await this.showRotationMessage(node, "Left Rotation");
            return this.rotateLeft(node);
        }

        return node;
    }

    getHeight(node) {
        if (!node) return 0;
        return 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    }

    getBalance(node) {
        if (!node) return 0;
        return this.getHeight(node.left) - this.getHeight(node.right);
    }

    rotateRight(y) {
        let x = y.left;
        let T2 = x.right;
        x.right = y;
        y.left = T2;
        return x;
    }

    rotateLeft(x) {
        let y = x.right;
        let T2 = y.left;
        y.left = x;
        x.right = T2;
        return y;
    }

    async showRotationMessage(node, msg) {
        node.highlightColor = '#FF0000'; // Red for imbalance
        rotationMessage.innerText = `Performing ${msg} on Node ${node.value}`;
        rotationMessage.style.display = 'block';
        await waitStep(1500); // Slow animation
        node.highlightColor = null;
        rotationMessage.style.display = 'none';
    }

    deleteNode(node, key) {
        if (!node) return null;

        if (key < node.value) {
            node.left = this.deleteNode(node.left, key);
            return node;
        } else if (key > node.value) {
            node.right = this.deleteNode(node.right, key);
            return node;
        } else {
            // Node found
            if (!node.left && !node.right) {
                return null;
            }
            if (!node.left) {
                return node.right;
            }
            if (!node.right) {
                return node.left;
            }

            let temp = this.findMin(node.right);
            node.value = temp.value;
            node.right = this.deleteNode(node.right, temp.value);
            return node;
        }
    }

    findMin(node) {
        while (node.left) node = node.left;
        return node;
    }

    async search(value) {
        this.clearHighlights();
        let current = this.root;
        while (current) {
            current.highlightColor = HIGHLIGHT_COLOR;
            await waitStep(500);
            if (value === current.value) {
                return; // Found, leave highlighted
            }

            // Revert color before moving to next
            current.highlightColor = null;

            if (value < current.value) {
                current = current.left;
            } else {
                current = current.right;
            }
        }
        // Not found
        alert('Value not found in tree');
        this.clearHighlights();
    }

    async preOrder() {
        this.clearHighlights();
        outputPanel.style.display = 'flex';
        outputLabel.innerText = 'PreOrder:';
        outputContent.innerText = '';
        await this.preOrderHelper(this.root);
        await waitStep(1000); // Replaced sleep with waitStep
        this.clearHighlights();
    }

    async preOrderHelper(node) {
        if (!node) return;
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'pre';
        outputContent.innerText += node.value + '➝';
        await waitStep(800);
        node.arrowType = null;
        await this.preOrderHelper(node.left);
        await this.preOrderHelper(node.right);
    }

    async inOrder() {
        this.clearHighlights();
        outputPanel.style.display = 'flex';
        outputLabel.innerText = 'InOrder:';
        outputContent.innerText = '';
        await this.inOrderHelper(this.root);
        await waitStep(1000); // Replaced sleep with waitStep
        this.clearHighlights();
    }

    async inOrderHelper(node) {
        if (!node) return;
        await this.inOrderHelper(node.left);
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'in';
        outputContent.innerText += node.value + '➝';
        await waitStep(800);
        node.arrowType = null;
        await this.inOrderHelper(node.right);
    }

    async postOrder() {
        this.clearHighlights();
        outputPanel.style.display = 'flex';
        outputLabel.innerText = 'PostOrder:';
        outputContent.innerText = '';
        await this.postOrderHelper(this.root);
        await waitStep(1000); // Replaced sleep with waitStep
        this.clearHighlights();
    }

    async postOrderHelper(node) {
        if (!node) return;
        await this.postOrderHelper(node.left);
        await this.postOrderHelper(node.right);
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'post';
        outputContent.innerText += node.value + '➝';
        await waitStep(800);
        node.arrowType = null;
    }

    balance() {
        const nodes = [];
        this.inOrderCollect(this.root, nodes);
        this.root = this.buildBalanced(nodes, 0, nodes.length - 1);
        this.updatePositions();
        this.updateStats();
    }

    inOrderCollect(node, list) {
        if (!node) return;
        this.inOrderCollect(node.left, list);
        list.push(node.value);
        this.inOrderCollect(node.right, list);
    }

    buildBalanced(list, start, end) {
        if (start > end) return null;
        const mid = Math.floor((start + end) / 2);
        const node = new Node(list[mid], canvas.width / 2, 60); // Start pos doesn't matter much, will update
        node.left = this.buildBalanced(list, start, mid - 1);
        node.right = this.buildBalanced(list, mid + 1, end);
        return node;
    }

    clear() {
        this.root = null;
        this.updatePositions();
        this.updateStats();
        outputPanel.style.display = 'none';
        outputContent.innerText = '';
    }

    clearHighlights() {
        this.clearHighlightsHelper(this.root);
    }

    clearHighlightsHelper(node) {
        if (!node) return;
        node.highlightColor = null;
        this.clearHighlightsHelper(node.left);
        this.clearHighlightsHelper(node.right);
    }

    updatePositions() {
        if (!this.root) return;
        // Initial gap: Start with a quarter of the screen width to ensure good spread
        const initialGap = canvas.width / 4;
        this.recalculatePositions(this.root, canvas.width / 2, 60, initialGap);
    }

    recalculatePositions(node, x, y, gap) {
        if (!node) return;
        node.targetX = x;
        node.targetY = y;

        // Recursively calculate positions for children
        // Halve the gap for each subsequent level to prevent overlap
        this.recalculatePositions(node.left, x - gap, y + 80, gap / 2);
        this.recalculatePositions(node.right, x + gap, y + 80, gap / 2);
    }

    updateStats() {
        const height = this.calculateHeight(this.root);
        const total = this.countNodes(this.root);
        const leaves = this.countLeaves(this.root);

        statHeight.innerText = height;
        statTotal.innerText = total;
        statLeaves.innerText = leaves;
    }

    calculateHeight(node) {
        if (!node) return 0;
        return 1 + Math.max(this.calculateHeight(node.left), this.calculateHeight(node.right));
    }

    countNodes(node) {
        if (!node) return 0;
        return 1 + this.countNodes(node.left) + this.countNodes(node.right);
    }

    countLeaves(node) {
        if (!node) return 0;
        if (!node.left && !node.right) return 1;
        return this.countLeaves(node.left) + this.countLeaves(node.right);
    }
}

const bst = new Tree();
const camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    if (bst.root) {
        drawConnections(bst.root);
        drawNodes(bst.root);
    }

    if (bst.droppingNode) {
        // Manually animate dropping node
        const node = bst.droppingNode;
        node.y += (node.targetY - node.y) * 0.1;
        node.draw(ctx);
    }

    ctx.restore();
    requestAnimationFrame(animate);
}

// Canvas Interactions
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    const newZoom = camera.zoom + delta;

    // Limit zoom
    if (newZoom > 0.1 && newZoom < 5) {
        // Zoom towards mouse pointer
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate mouse position in world space before zoom
        const worldX = (mouseX - camera.x) / camera.zoom;
        const worldY = (mouseY - camera.y) / camera.zoom;

        camera.zoom = newZoom;

        // Adjust camera to keep mouse position stable
        camera.x = mouseX - worldX * camera.zoom;
        camera.y = mouseY - worldY * camera.zoom;
    }
});

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        camera.x += dx;
        camera.y += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
});

function drawConnections(node) {
    if (node.left) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.left.x, node.left.y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        drawConnections(node.left);
    }
    if (node.right) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.right.x, node.right.y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        drawConnections(node.right);
    }
}

function drawNodes(node) {
    // Lerp position for smooth animation
    node.x += (node.targetX - node.x) * 0.1;
    node.y += (node.targetY - node.y) * 0.1;

    node.draw(ctx);
    if (node.left) drawNodes(node.left);
    if (node.right) drawNodes(node.right);
}

// Controls
const valueInput = document.getElementById('valueInput');

document.getElementById('insertBtn').addEventListener('click', () => {
    const val = parseInt(valueInput.value);
    if (!isNaN(val)) {
        bst.insert(val);
        valueInput.value = '';
    }
});

document.getElementById('deleteBtn').addEventListener('click', () => {
    const val = parseInt(valueInput.value);
    if (!isNaN(val)) {
        bst.delete(val);
        valueInput.value = '';
    }
});

document.getElementById('searchBtn').addEventListener('click', async () => {
    const val = parseInt(valueInput.value);
    if (!isNaN(val)) {
        toggleButtons(true);
        await bst.search(val);
        toggleButtons(false);
    }
});

document.getElementById('preOrderBtn').addEventListener('click', async () => {
    toggleButtons(true);
    await bst.preOrder();
    toggleButtons(false);
});

document.getElementById('inOrderBtn').addEventListener('click', async () => {
    toggleButtons(true);
    await bst.inOrder();
    toggleButtons(false);
});

document.getElementById('postOrderBtn').addEventListener('click', async () => {
    toggleButtons(true);
    await bst.postOrder();
    toggleButtons(false);
});

document.getElementById('balanceBtn').addEventListener('click', () => bst.balance());
document.getElementById('clearBtn').addEventListener('click', () => bst.clear());

document.getElementById('randomBtn').addEventListener('click', async () => {
    toggleButtons(true);
    bst.clear(); // Clear existing tree first
    for (let i = 0; i < 15; i++) {
        const val = Math.floor(Math.random() * 100) + 1;
        await bst.insert(val); // Await the insert (which handles animation/delays)
        await waitStep(200); // Small extra delay between numbers
    }
    toggleButtons(false);
});

// Mode Selector Logic
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        isStepMode = e.target.value === 'step';
        if (!isStepMode) {
            // Switched to Auto: Release any pending step
            if (resolveStep) {
                resolveStep();
                resolveStep = null;
            }
            nextStepBtn.disabled = true;
        } else {
            nextStepBtn.disabled = true; // Will be enabled by waitStep
        }
    });
});

nextStepBtn.addEventListener('click', () => {
    if (resolveStep) {
        resolveStep();
        resolveStep = null;
    }
});

treeTypeSelect.addEventListener('change', (e) => {
    treeType = e.target.value;
    bst.clear();
});

function toggleButtons(disabled) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = disabled);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    bst.updatePositions();
});

// Start animation
animate();
