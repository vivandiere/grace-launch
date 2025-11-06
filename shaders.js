export const simulationVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simulationFragmentShader = `
uniform sampler2D textureA;
uniform vec2 mouse;
uniform vec2 resolution;
uniform float time;
uniform int frame;
uniform float isMobile;
varying vec2 vUv;

const float delta = 1.4;  

void main() {
    vec2 uv = vUv;
    if (frame == 0) {
        gl_FragColor = vec4(0.0);
        return;
    }
    
    vec4 data = texture2D(textureA, uv);
    float pressure = data.x;
    float pVel = data.y;
    
    vec2 texelSize = 1.0 / resolution;
    float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
    float p_left = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
    float p_up = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
    float p_down = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;
    
    if (uv.x <= texelSize.x) p_left = p_right;
    if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
    if (uv.y <= texelSize.y) p_down = p_up;
    if (uv.y >= 1.0 - texelSize.y) p_up = p_down;
    
    // Enhanced wave equation matching ShaderToy
    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;
    
    pressure += delta * pVel;
    
    pVel -= 0.005 * delta * pressure;
    
    pVel *= 1.0 - 0.002 * delta;
    pressure *= 0.999;
    
    vec2 mouseUV = mouse / resolution;
    if(mouse.x > 0.0) {
        float dist = distance(uv, mouseUV);
        float touchRadius = mix(0.025, 0.04, isMobile);  // Larger radius on mobile
        if(dist <= touchRadius) {
            float falloff = 1.0 - dist / touchRadius;
            float intensity = mix(1.2, 2.0, isMobile);  // Stronger on mobile
            pressure += intensity * falloff * falloff;
        }
    }
    
    // Multiple subtle continuous wave patterns for dynamic ambient water motion
    // Horizontal waves
    float wave1 = sin(time * 0.5 + uv.x * 6.0 + uv.y * 2.0) * 0.15;
    // Vertical waves
    float wave2 = sin(time * 0.6 + uv.y * 5.5 + uv.x * 1.5) * 0.13;
    // Diagonal waves
    float wave3 = sin(time * 0.7 + (uv.x + uv.y) * 4.5) * 0.11;
    // Circular ripples from multiple points
    vec2 rippleCenter1 = vec2(0.3, 0.4);
    vec2 rippleCenter2 = vec2(0.7, 0.6);
    vec2 rippleCenter3 = vec2(0.5, 0.2);
    
    float dist1 = distance(uv, rippleCenter1);
    float dist2 = distance(uv, rippleCenter2);
    float dist3 = distance(uv, rippleCenter3);
    
    float ripple1 = sin(dist1 * 8.0 - time * 1.2) * exp(-dist1 * 3.0) * 0.08;
    float ripple2 = sin(dist2 * 7.0 - time * 1.0) * exp(-dist2 * 3.5) * 0.07;
    float ripple3 = sin(dist3 * 9.0 - time * 1.4) * exp(-dist3 * 2.8) * 0.09;
    
    // Combine all ambient waves - increase intensity on mobile
    float ambientWave = wave1 + wave2 + wave3 + ripple1 + ripple2 + ripple3;
    float ambientIntensity = mix(0.35, 0.55, isMobile);  // More visible on mobile
    pressure += ambientWave * ambientIntensity;
    
    gl_FragColor = vec4(pressure, pVel, 
        (p_right - p_left) / 2.0, 
        (p_up - p_down) / 2.0);
}
`;

export const renderVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const renderFragmentShader = `
uniform sampler2D textureA;
uniform sampler2D textureB;
uniform float isMobile;
varying vec2 vUv;

void main() {
    vec4 data = texture2D(textureA, vUv);
    
    // Increase distortion intensity on mobile for better visibility
    float distortionStrength = mix(0.35, 0.5, isMobile);
    vec2 distortion = distortionStrength * data.zw;
    
    // Clamp UV coordinates to prevent black edges
    vec2 distortedUV = clamp(vUv + distortion, 0.001, 0.999);
    vec4 color = texture2D(textureB, distortedUV);
    
    // Reduced normal calculation for subtler effect
    vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
    vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
    
    // Increased specular highlights on mobile
    float specular1 = pow(max(0.0, dot(normal, lightDir)), 60.0) * mix(0.8, 1.2, isMobile);
    float specular2 = pow(max(0.0, dot(normal, normalize(vec3(5.0, 8.0, -2.0)))), 80.0) * mix(0.5, 0.8, isMobile);
    
    // Add subtle refraction by sampling slightly offset positions
    vec3 refracted1 = texture2D(textureB, clamp(vUv + distortion * 0.5, 0.001, 0.999)).rgb;
    vec3 refracted2 = texture2D(textureB, clamp(vUv + distortion * 0.3, 0.001, 0.999)).rgb;
    
    // Increase refraction mixing on mobile
    float refractionMix1 = mix(0.08, 0.12, isMobile);
    float refractionMix2 = mix(0.05, 0.08, isMobile);
    color.rgb = mix(color.rgb, refracted1, refractionMix1);
    color.rgb = mix(color.rgb, refracted2, refractionMix2);
    
    // Increased specular highlights on mobile
    float specularIntensity = mix(0.4, 0.6, isMobile);
    color.rgb += vec3(specular1 + specular2) * specularIntensity;
    
    // Enhanced brightness variation on mobile
    float waveIntensity = length(data.zw);
    float brightnessVariation = mix(0.2, 0.35, isMobile);
    color.rgb += vec3(0.03) * sin(waveIntensity * 30.0) * brightnessVariation;
    
    gl_FragColor = color;
}
`;
