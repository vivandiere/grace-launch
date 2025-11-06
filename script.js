import {
  simulationVertexShader,
  simulationFragmentShader,
  renderVertexShader,
  renderFragmentShader,
} from "./shaders.js";

document.addEventListener("DOMContentLoaded", () => {
  // Check WebGL support
  const canvas = document.createElement("canvas");
  const testGl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!testGl) {
    document.body.innerHTML = `
      <div style="color: white; text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>WebGL Not Supported</h2>
        <p>Your device or browser doesn't support WebGL, which is required for this effect.</p>
        <p>Please try updating your browser or using a different device.</p>
      </div>
    `;
    return;
  }

  const scene = new THREE.Scene();
  const simScene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  
  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  
  // Force 16:9 aspect ratio for image content
  const imageAspectRatio = 16 / 9;
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;
  
  const updateCanvasSize = () => {
    // Canvas always fills viewport
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    const viewportAspect = canvasWidth / canvasHeight;
    
    renderer.setSize(canvasWidth, canvasHeight);
    const renderWidth = canvasWidth * pixelRatio;
    const renderHeight = canvasHeight * pixelRatio;
    rtA.setSize(renderWidth, renderHeight);
    rtB.setSize(renderWidth, renderHeight);
    simMaterial.uniforms.resolution.value.set(renderWidth, renderHeight);
    
    // Update uniforms for shader to handle 16:9 cropping
    if (renderMaterial.uniforms.imageAspectRatio) {
      renderMaterial.uniforms.imageAspectRatio.value = imageAspectRatio;
    }
    if (renderMaterial.uniforms.viewportAspect) {
      renderMaterial.uniforms.viewportAspect.value = viewportAspect;
    }
    if (renderMaterial.uniforms.canvasSize) {
      renderMaterial.uniforms.canvasSize.value.set(canvasWidth, canvasHeight);
    }
  };
  
  renderer.setSize(canvasWidth, canvasHeight);
  document.body.appendChild(renderer.domElement);

  const mouse = new THREE.Vector2();
  let frame = 0;

  // Initialize render targets with temporary size, will be updated when image loads
  const initialWidth = canvasWidth * pixelRatio;
  const initialHeight = canvasHeight * pixelRatio;
  
  // Check WebGL support and choose appropriate texture type for mobile compatibility
  const gl = renderer.getContext();
  let textureType = THREE.FloatType;
  
  // Test if FloatType is supported (required for high precision)
  const testTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, testTexture);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);
    if (gl.getError() !== gl.NO_ERROR) {
      throw new Error("FloatType not supported");
    }
  } catch (e) {
    // Fallback to HalfFloatType (better mobile support)
    try {
      const ext = gl.getExtension("OES_texture_half_float");
      if (ext) {
        textureType = THREE.HalfFloatType;
        console.log("Using HalfFloatType for better mobile compatibility");
      } else {
        // Final fallback to UnsignedByteType (universal support, lower precision)
        textureType = THREE.UnsignedByteType;
        console.log("Using UnsignedByteType - effect may have reduced quality");
      }
    } catch (e2) {
      textureType = THREE.UnsignedByteType;
      console.log("Using UnsignedByteType - effect may have reduced quality");
    }
  }
  gl.deleteTexture(testTexture);
  
  const options = {
    format: THREE.RGBAFormat,
    type: textureType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  };
  let rtA = new THREE.WebGLRenderTarget(initialWidth, initialHeight, options);
  let rtB = new THREE.WebGLRenderTarget(initialWidth, initialHeight, options);
  
  // Ensure render target textures have proper wrapping
  rtA.texture.wrapS = THREE.ClampToEdgeWrapping;
  rtA.texture.wrapT = THREE.ClampToEdgeWrapping;
  rtB.texture.wrapS = THREE.ClampToEdgeWrapping;
  rtB.texture.wrapT = THREE.ClampToEdgeWrapping;

  const simMaterial = new THREE.ShaderMaterial({
    uniforms: {
      textureA: { value: null },
      mouse: { value: mouse },
      resolution: { value: new THREE.Vector2(initialWidth, initialHeight) },
      time: { value: 0 },
      frame: { value: 0 },
      isMobile: { value: isMobile ? 1.0 : 0.0 },
    },
    vertexShader: simulationVertexShader,
    fragmentShader: simulationFragmentShader,
  });

  const renderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      textureA: { value: null },
      textureB: { value: null },
      isMobile: { value: isMobile ? 1.0 : 0.0 },
      imageAspectRatio: { value: imageAspectRatio },
      viewportAspect: { value: window.innerWidth / window.innerHeight },
      canvasSize: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: renderVertexShader,
    fragmentShader: renderFragmentShader,
    transparent: true,
  });

  const plane = new THREE.PlaneGeometry(2, 2);
  const simQuad = new THREE.Mesh(plane, simMaterial);
  const renderQuad = new THREE.Mesh(plane, renderMaterial);

  simScene.add(simQuad);
  scene.add(renderQuad);

  // Load image texture instead of canvas text
  const textureLoader = new THREE.TextureLoader();
  let imageTexture = textureLoader.load(
    "./assets/ship-render-text.jpg",
    (texture) => {
      // Texture loaded successfully
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      
      // Force 16:9 aspect ratio (don't use actual image dimensions)
      // Image will be cropped to 16:9 in the shader
      updateCanvasSize();
      
      console.log("Image loaded successfully", texture.image.width, texture.image.height);
    },
    undefined,
    (error) => {
      console.error("Error loading image:", error);
      // Fallback: create a simple colored canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      fallbackTexture.minFilter = THREE.LinearFilter;
      fallbackTexture.magFilter = THREE.LinearFilter;
      imageTexture = fallbackTexture;
    }
  );
  
  // Set texture properties
  imageTexture.minFilter = THREE.LinearFilter;
  imageTexture.magFilter = THREE.LinearFilter;
  imageTexture.format = THREE.RGBAFormat;
  imageTexture.wrapS = THREE.ClampToEdgeWrapping;
  imageTexture.wrapT = THREE.ClampToEdgeWrapping;

  window.addEventListener("resize", () => {
    updateCanvasSize();
    
    // Image texture will automatically handle resize
    if (imageTexture) {
      imageTexture.needsUpdate = true;
    }
  });

  renderer.domElement.addEventListener("mousemove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasWidth * pixelRatio;
    const y = ((rect.height - (e.clientY - rect.top)) / rect.height) * canvasHeight * pixelRatio;
    mouse.x = x;
    mouse.y = y;
  });

  renderer.domElement.addEventListener("mouseleave", () => {
    mouse.set(0, 0);
  });

  // Touch support for mobile devices
  renderer.domElement.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * canvasWidth * pixelRatio;
      const y = ((rect.height - (touch.clientY - rect.top)) / rect.height) * canvasHeight * pixelRatio;
      mouse.x = x;
      mouse.y = y;
    }
  }, { passive: false });

  renderer.domElement.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * canvasWidth * pixelRatio;
      const y = ((rect.height - (touch.clientY - rect.top)) / rect.height) * canvasHeight * pixelRatio;
      mouse.x = x;
      mouse.y = y;
    }
  }, { passive: false });

  renderer.domElement.addEventListener("touchend", () => {
    mouse.set(0, 0);
  });

  const animate = () => {
    simMaterial.uniforms.frame.value = frame++;
    simMaterial.uniforms.time.value = performance.now() / 1000;

    // Ensure textures are ready
    if (!imageTexture || !rtA || !rtB) {
      requestAnimationFrame(animate);
      return;
    }

    simMaterial.uniforms.textureA.value = rtA.texture;
    renderer.setRenderTarget(rtB);
    renderer.render(simScene, camera);

    renderMaterial.uniforms.textureA.value = rtB.texture;
    renderMaterial.uniforms.textureB.value = imageTexture;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    const temp = rtA;
    rtA = rtB;
    rtB = temp;

    requestAnimationFrame(animate);
  };

  // Start animation after a short delay to ensure everything is loaded
  setTimeout(() => {
    animate();
  }, 100);
});
