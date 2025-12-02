const canvas = document.getElementById('bstCanvas');
const ctx = canvas.getContext('2d');
const outputContent = document.getElementById('outputContent');
const outputPanel = document.querySelector('.output-panel');
const outputLabel = document.getElementById('outputLabel');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const NODE_RADIUS = 20;
const NODE_COLOR = '#FF9F1C';
const HIGHLIGHT_COLOR = '#00FF00'; // Green for search path
const TRAVERSE_COLOR = '#00F5FF'; // Neon Cyan for traversals
const TEXT_COLOR = '#FFFFFF';

// Helper for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    }

    insert(value) {
        if (isNaN(value)) return;
        if (!this.root) {
            this.root = new Node(value, canvas.width / 2, 60);
        } else {
            this.insertNode(this.root, value);
        }
        this.updatePositions();
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

    delete(value) {
        this.root = this.deleteNode(this.root, value);
        this.updatePositions();
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
            await sleep(500);
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
        await sleep(1000);
        this.clearHighlights();
    }

    async preOrderHelper(node) {
        if (!node) return;
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'pre';
        outputContent.innerText += node.value + '➝';
        await sleep(800);
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
        await sleep(1000);
        this.clearHighlights();
    }

    async inOrderHelper(node) {
        if (!node) return;
        await this.inOrderHelper(node.left);
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'in';
        outputContent.innerText += node.value + '➝';
        await sleep(800);
        node.arrowType = null;
        await this.inOrderHelper(node.right);
    }

    async postOrder() {
        this.clearHighlights();
        outputPanel.style.display = 'flex';
        outputLabel.innerText = 'PostOrder:';
        outputContent.innerText = '';
        await this.postOrderHelper(this.root);
        await sleep(1000);
        this.clearHighlights();
    }

    async postOrderHelper(node) {
        if (!node) return;
        await this.postOrderHelper(node.left);
        await this.postOrderHelper(node.right);
        node.highlightColor = TRAVERSE_COLOR;
        node.arrowType = 'post';
        outputContent.innerText += node.value + '➝';
        await sleep(800);
        node.arrowType = null;
    }

    balance() {
        const nodes = [];
        this.inOrderCollect(this.root, nodes);
        this.root = this.buildBalanced(nodes, 0, nodes.length - 1);
        this.updatePositions();
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
}

const bst = new Tree();

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bst.root) {
        drawConnections(bst.root);
        drawNodes(bst.root);
    }

    requestAnimationFrame(animate);
}

function drawConnections(node) {
    if (node.left) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.left.x, node.left.y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        drawConnections(node.left);
    }
    if (node.right) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(node.right.x, node.right.y);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
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
        bst.insert(val);
        await sleep(500); // Wait for animation (approximate)
    }
    toggleButtons(false);
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
