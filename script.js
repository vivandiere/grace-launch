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
  const rippleRadius = isMobile ? 20 : 36;
  const rippleForce = isMobile ? 320 : 300;
  const randomForce = rippleForce * 0.65;
  const randomRadius = rippleRadius + 2;
  const hoverForce = rippleForce * 0.1;
  const hoverRadius = Math.max(12, rippleRadius - 12);
  const hoverInterval = isMobile ? 65 : 55;
  const clickForce = rippleForce * 1.18;
  const clickRadius = rippleRadius + 6;
  const dragForceDesktop = rippleForce * 0.5;
  const dragForceDefault = rippleForce * 0.42;
  const dragRadiusDesktop = rippleRadius + 3;
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
  let lastHoverTime = 0;
  let lastIdleTime = 0;
  let pointerMotion = {
    x: -1,
    y: -1,
    t: 0,
    speed: 0,
    dirX: 1,
    dirY: 0,
  };

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
    canvas.style.width = "100%";
    canvas.style.height = "auto";

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

  const updatePointerMotion = (x, y) => {
    const now = performance.now();
    if (pointerMotion.t !== 0) {
      const dt = now - pointerMotion.t;
      if (dt > 0) {
        const vx = (x - pointerMotion.x) / dt;
        const vy = (y - pointerMotion.y) / dt;
        const speed = Math.hypot(vx, vy);
        let dirX = pointerMotion.dirX;
        let dirY = pointerMotion.dirY;
        if (speed > 0.0004) {
          dirX = vx / speed;
          dirY = vy / speed;
        }
        pointerMotion = {
          x,
          y,
          t: now,
          speed,
          dirX,
          dirY,
        };
      } else {
        pointerMotion = { ...pointerMotion, x, y, t: now, speed: 0 };
      }
    } else {
      pointerMotion = { ...pointerMotion, x, y, t: now, speed: 0 };
    }
    return pointerMotion;
  };

  const updatePointerMotionFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = simWidth / rect.width;
    const scaleY = simHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return updatePointerMotion(x, y);
  };

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
    }, isMobile ? 1000 : 1300);
  }

  function disturb(x, y, force = rippleForce, radius = rippleRadius, motion = null) {
    if (!rippleMap) return;

    const baseForce = force;
    const centerX = Math.round(x);
    const centerY = Math.round(y);

    let dirX = 0;
    let dirY = 0;
    let hasDirection = false;
    let majorRadius = radius * 1.5;
    let minorRadius = radius * 0.9;
    let strengthScale = 1;

    if (motion && motion.speed && motion.speed > 0.0004) {
      dirX = motion.dirX;
      dirY = motion.dirY;
      hasDirection = true;
      const speedNorm = Math.min(motion.speed * 45, 1.0);
      majorRadius = radius * (1.7 + speedNorm * 1.3);
      minorRadius = radius * 0.55;
      strengthScale = 0.6 + speedNorm * 0.7;
    }

    const radiusInt = Math.max(2, Math.ceil(Math.max(majorRadius, minorRadius)));
    const majorSq = majorRadius * majorRadius;
    const minorSq = minorRadius * minorRadius;

    for (let j = centerY - radiusInt; j <= centerY + radiusInt; j++) {
      if (j < 0 || j >= simHeight) continue;
      const dy = j - centerY;
      const rowIndex = oldIndex + j * simWidth;

      for (let k = centerX - radiusInt; k <= centerX + radiusInt; k++) {
        if (k < 0 || k >= simWidth) continue;
        const dx = k - centerX;

        let distNorm;
        if (hasDirection) {
          const parallel = dx * dirX + dy * dirY;
          const perpendicular = -dx * dirY + dy * dirX;
          distNorm = Math.sqrt((parallel * parallel) / majorSq + (perpendicular * perpendicular) / minorSq);
        } else {
          distNorm = Math.sqrt((dx * dx) / majorSq + (dy * dy) / minorSq);
        }

        if (distNorm > 1) continue;
        const falloff = 1 - distNorm;
        const weightedForce = baseForce * strengthScale * falloff * falloff;
        rippleMap[rowIndex + k] += weightedForce;
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

    const refractionScale = isMobile ? 0.38 : 0.32;

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
          const wave = (data - 1024) / 1024;
          let a = x + (x - _halfWidth) * wave * refractionScale;
          let b = y + (y - _halfHeight) * wave * refractionScale;

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
    const motion = updatePointerMotionFromEvent(event);
    activePointerId = event.pointerId;
    pointerActive = true;
    const force = !isMobile && event.pointerType === "mouse" ? clickForce : rippleForce;
    const radius = !isMobile && event.pointerType === "mouse" ? clickRadius : rippleRadius;
    disturb(motion.x, motion.y, force, radius, motion);
  }

  function handlePointerMove(event) {
    let motion = updatePointerMotionFromEvent(event);

    if (!isMobile && event.pointerType === "mouse" && event.buttons === 0) {
      const now = performance.now();
      if (now - lastHoverTime >= hoverInterval) {
        lastHoverTime = now;
        motion = pointerMotion;
        disturb(motion.x, motion.y, hoverForce, hoverRadius, motion);
      }
    }

    if (!pointerActive || event.pointerId !== activePointerId) return;
    event.preventDefault();
    const force = !isMobile && event.pointerType === "mouse" ? dragForceDesktop : dragForceDefault;
    const radius = !isMobile && event.pointerType === "mouse" ? dragRadiusDesktop : rippleRadius;
    motion = pointerMotion;
    disturb(motion.x, motion.y, force, radius, motion);
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    pointerActive = false;
    activePointerId = null;
  }

  canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
  canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", () => {
    pointerActive = false;
    activePointerId = null;
    pointerMotion = {
      x: -1,
      y: -1,
      t: 0,
      speed: 0,
      dirX: 1,
      dirY: 0,
    };
  });

  function idleHoverDisturb() {
    if (!isMobile && pointerMotion.x >= 0) {
      const now = performance.now();
      if (now - lastIdleTime >= 320) {
        lastIdleTime = now;
        const motion = pointerMotion;
        disturb(motion.x, motion.y, hoverForce * 0.6, hoverRadius + 2, motion);
      }
    }
    requestAnimationFrame(idleHoverDisturb);
  }

  idleHoverDisturb();

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

