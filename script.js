document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("rippleCanvas");
  if (!canvas) {
    console.error("rippleCanvas element is missing");
    return;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    console.error("Canvas 2D context is not available");
    return;
  }

  canvas.style.touchAction = "none";

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 820;
  const rippleRadius = isMobile ? 6 : 5;
  const rippleForce = isMobile ? 384 : 512;
  const randomForce = rippleForce * 0.85;
  const randomRadius = rippleRadius + 2;
  const dampingShift = 5;

  let aspectRatio = 16 / 9;
  let simWidth = 0;
  let simHeight = 0;
  let size = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  let rippleMap;
  let lastMap;
  let rippleData;
  let textureData;
  let oldIndex = 0;
  let newIndex = 0;
  let animationFrameId = null;
  let randomIntervalId = null;
  let resizeTimeoutId = null;
  let imageLoaded = false;
  let activePointerId = null;
  let pointerActive = false;

  const image = new Image();
  image.src = "./assets/ship-render-text.jpg";
  image.onload = () => {
    aspectRatio = image.width / image.height;
    imageLoaded = true;
    initializeRipple();
    startAnimation();
    startRandomRipples();
  };

  image.onerror = (error) => {
    console.error("Failed to load ripple background image", error);
  };

  function initializeRipple() {
    if (!imageLoaded) return;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (randomIntervalId) {
      clearInterval(randomIntervalId);
      randomIntervalId = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;

    const displayWidth = viewportWidth;
    const displayHeight = Math.round(displayWidth / aspectRatio);

    simWidth = Math.max(256, Math.round(displayWidth * dpr));
    simHeight = Math.max(256, Math.round(displayHeight * dpr));

    if (simWidth % 2 !== 0) simWidth += 1;
    if (simHeight % 2 !== 0) simHeight += 1;

    canvas.width = simWidth;
    canvas.height = simHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, simWidth, simHeight);
    ctx.drawImage(image, 0, 0, simWidth, simHeight);

    textureData = ctx.getImageData(0, 0, simWidth, simHeight);
    rippleData = ctx.getImageData(0, 0, simWidth, simHeight);

    size = simWidth * (simHeight + 2) * 2;
    rippleMap = new Int16Array(size);
    lastMap = new Int16Array(size);

    halfWidth = simWidth >> 1;
    halfHeight = simHeight >> 1;
    oldIndex = simWidth;
    newIndex = simWidth * (simHeight + 3);
  }

  function startAnimation() {
    const frame = () => {
      if (imageLoaded && rippleMap) {
        newFrame();
        ctx.putImageData(rippleData, 0, 0);
      }
      animationFrameId = requestAnimationFrame(frame);
    };

    frame();
  }

  function startRandomRipples() {
    if (randomIntervalId) {
      clearInterval(randomIntervalId);
    }

    randomIntervalId = setInterval(() => {
      if (!rippleMap) return;
      disturb(Math.random() * simWidth, Math.random() * simHeight, randomForce, randomRadius);
    }, isMobile ? 900 : 1100);
  }

  function disturb(x, y, force = rippleForce, radius = rippleRadius) {
    if (!rippleMap) return;

    x = x << 0;
    y = y << 0;

    for (let j = y - radius; j < y + radius; j++) {
      if (j < 0 || j >= simHeight) continue;
      let mapIndex = oldIndex + j * simWidth;
      for (let k = x - radius; k < x + radius; k++) {
        if (k < 0 || k >= simWidth) continue;
        rippleMap[mapIndex + k] += force;
      }
    }
  }

  function newFrame() {
    let temp = oldIndex;
    oldIndex = newIndex;
    newIndex = temp;

    let mapIndex = oldIndex;
    let dataIndex = 0;

    const width = simWidth;
    const height = simHeight;
    const _rippleMap = rippleMap;
    const _lastMap = lastMap;
    const _textureData = textureData.data;
    const _rippleData = rippleData.data;
    const _newIndex = newIndex;
    const _halfWidth = halfWidth;
    const _halfHeight = halfHeight;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let data = (
          _rippleMap[mapIndex - width] +
          _rippleMap[mapIndex + width] +
          _rippleMap[mapIndex - 1] +
          _rippleMap[mapIndex + 1]
        ) >> 1;

        data -= _rippleMap[_newIndex + dataIndex];
        data -= data >> dampingShift;
        _rippleMap[_newIndex + dataIndex] = data;

        data = 1024 - data;

        const oldData = _lastMap[dataIndex];
        _lastMap[dataIndex] = data;

        if (oldData !== data) {
          let a = (((x - _halfWidth) * data) / 1024) + _halfWidth;
          let b = (((y - _halfHeight) * data) / 1024) + _halfHeight;

          if (a >= width) a = width - 1;
          else if (a < 0) a = 0;
          if (b >= height) b = height - 1;
          else if (b < 0) b = 0;

          a = a << 0;
          b = b << 0;

          const newPixel = (a + b * width) * 4;
          const currentPixel = dataIndex * 4;

          _rippleData[currentPixel] = _textureData[newPixel];
          _rippleData[currentPixel + 1] = _textureData[newPixel + 1];
          _rippleData[currentPixel + 2] = _textureData[newPixel + 2];
          _rippleData[currentPixel + 3] = _textureData[newPixel + 3];
        }

        mapIndex++;
        dataIndex++;
      }
    }
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || !imageLoaded) return;
    event.preventDefault();
    activePointerId = event.pointerId;
    pointerActive = true;
    disturbFromPointer(event, rippleForce, rippleRadius);
  }

  function handlePointerMove(event) {
    if (!pointerActive || event.pointerId !== activePointerId) return;
    event.preventDefault();
    disturbFromPointer(event, rippleForce * 0.6, rippleRadius);
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    pointerActive = false;
    activePointerId = null;
  }

  function disturbFromPointer(event, force, radius) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = simWidth / rect.width;
    const scaleY = simHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    disturb(x, y, force, radius);
  }

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", () => {
    pointerActive = false;
    activePointerId = null;
  });

  window.addEventListener("resize", () => {
    if (!imageLoaded) return;
    if (resizeTimeoutId) {
      clearTimeout(resizeTimeoutId);
    }
    resizeTimeoutId = window.setTimeout(() => {
      initializeRipple();
      startAnimation();
      startRandomRipples();
    }, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (!imageLoaded) return;
    const hidden = document.hidden;
    if (hidden) {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (randomIntervalId) {
        clearInterval(randomIntervalId);
        randomIntervalId = null;
      }
    } else {
      startAnimation();
      startRandomRipples();
    }
  });
});

