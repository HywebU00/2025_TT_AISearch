const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const downloadBtn = document.getElementById('downloadBtn');
const previewCanvas = document.getElementById('preview');
const previewCtx = previewCanvas.getContext('2d');

let img = new Image();
let isDragging = false;
let isMoving = false;
let isResizing = false;
let resizeMode = ''; // 'move', 'tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right'
let startX = 0, startY = 0;
let offset = { x: 0, y: 0 };

const cornerSize = 4;
const edgeTolerance = 6;

let rect = { x: 50, y: 50, w: 200, h: 150 };

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      rect = { x: 50, y: 50, w: 200, h: 150 };
      drawOverlay();
      updatePreview();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getMousePos(e);
  startX = x;
  startY = y;

  resizeMode = detectHit(x, y);

  if (resizeMode === 'move') {
    isMoving = true;
    offset.x = x - rect.x;
    offset.y = y - rect.y;
  } else if (resizeMode) {
    isResizing = true;
  } else {
    isDragging = true;
    rect = { x, y, w: 0, h: 0 };
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getMousePos(e);

  if (isDragging) {
    rect.w = x - startX;
    rect.h = y - startY;
    if (rect.w < 0) {
      rect.x = x;
      rect.w = Math.abs(rect.w);
    }
    if (rect.h < 0) {
      rect.y = y;
      rect.h = Math.abs(rect.h);
    }
  } else if (isMoving) {
    rect.x = x - offset.x;
    rect.y = y - offset.y;
    limitToBounds();
  } else if (isResizing) {
    resizeRect(x, y);
    limitToBounds();
  } else {
    updateCursor(x, y);
    return;
  }

  drawOverlay();
  updatePreview();
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  isMoving = false;
  isResizing = false;
  resizeMode = '';
});

function getMousePos(e) {
  const rectCanvas = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rectCanvas.left,
    y: e.clientY - rectCanvas.top
  };
}

function detectHit(x, y) {
  const inX = x >= rect.x && x <= rect.x + rect.w;
  const inY = y >= rect.y && y <= rect.y + rect.h;

  const nearTop = Math.abs(y - rect.y) < edgeTolerance;
  const nearBottom = Math.abs(y - (rect.y + rect.h)) < edgeTolerance;
  const nearLeft = Math.abs(x - rect.x) < edgeTolerance;
  const nearRight = Math.abs(x - (rect.x + rect.w)) < edgeTolerance;

  // Corners
  if (nearTop && nearLeft) return 'tl';
  if (nearTop && nearRight) return 'tr';
  if (nearBottom && nearLeft) return 'bl';
  if (nearBottom && nearRight) return 'br';

  // Edges
  if (nearTop && inX) return 'top';
  if (nearBottom && inX) return 'bottom';
  if (nearLeft && inY) return 'left';
  if (nearRight && inY) return 'right';

  // Inside move
  if (inX && inY) return 'move';

  return '';
}

function updateCursor(x, y) {
  const mode = detectHit(x, y);
  const cursors = {
    tl: 'nwse-resize', tr: 'nesw-resize',
    bl: 'nesw-resize', br: 'nwse-resize',
    top: 'ns-resize', bottom: 'ns-resize',
    left: 'ew-resize', right: 'ew-resize',
    move: 'move'
  };
  canvas.style.cursor = cursors[mode] || 'crosshair';
}

function resizeRect(x, y) {
  const minW = 20, minH = 20;
  const r = rect;

  switch (resizeMode) {
    case 'tl':
      r.w += r.x - x;
      r.h += r.y - y;
      r.x = x;
      r.y = y;
      break;
    case 'tr':
      r.w = x - r.x;
      r.h += r.y - y;
      r.y = y;
      break;
    case 'bl':
      r.w += r.x - x;
      r.x = x;
      r.h = y - r.y;
      break;
    case 'br':
      r.w = x - r.x;
      r.h = y - r.y;
      break;
    case 'top':
      r.h += r.y - y;
      r.y = y;
      break;
    case 'bottom':
      r.h = y - r.y;
      break;
    case 'left':
      r.w += r.x - x;
      r.x = x;
      break;
    case 'right':
      r.w = x - r.x;
      break;
  }

  if (r.w < minW) r.w = minW;
  if (r.h < minH) r.h = minH;
}

function limitToBounds() {
  rect.x = Math.max(0, Math.min(rect.x, canvas.width - rect.w));
  rect.y = Math.max(0, Math.min(rect.y, canvas.height - rect.h));
  rect.w = Math.max(1, Math.min(rect.w, canvas.width - rect.x));
  rect.h = Math.max(1, Math.min(rect.h, canvas.height - rect.y));
}

function drawOverlay() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  // 遮罩
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.fill('evenodd');
  ctx.restore();

  // 邊框
  ctx.strokeStyle = '#fcb708';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  // 控制點（角落）
  ctx.fillStyle = '#fcb708';
  drawHandle(rect.x, rect.y);
  drawHandle(rect.x + rect.w, rect.y);
  drawHandle(rect.x, rect.y + rect.h);
  drawHandle(rect.x + rect.w, rect.y + rect.h);
}

function drawHandle(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, cornerSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function updatePreview() {
  if (rect.w === 0 || rect.h === 0) return;
  previewCanvas.width = rect.w;
  previewCanvas.height = rect.h;
  previewCtx.clearRect(0, 0, rect.w, rect.h);
  previewCtx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
}

downloadBtn.addEventListener('click', () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = rect.w;
  tempCanvas.height = rect.h;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

  const link = document.createElement('a');
  link.download = 'screenshot.png';
  link.href = tempCanvas.toDataURL();
  link.click();
});
