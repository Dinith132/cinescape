export const galaxyVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aGenreVisible;
  attribute float aType;
  attribute float aSeed;
  attribute float aIndex;

  uniform float uPixelRatio;
  uniform float uBaseSize;
  uniform float uSizeRange;
  uniform float uHoveredScale;
  uniform float uDimmedOpacity;
  uniform float uTime;
  uniform float uSelectedIdx;
  uniform float uHoveredIdx;
  uniform float uActiveType;
  uniform float uReducedMotion;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vHovered;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float isSelected = step(abs(aIndex - uSelectedIdx), 0.25);
    float isHovered = step(abs(aIndex - uHoveredIdx), 0.25) * (1.0 - isSelected);

    float matchesGenre = aGenreVisible;
    float matchesType = uActiveType < -0.5 ? 1.0 : step(abs(aType - uActiveType), 0.25);
    float isVisible = matchesGenre * matchesType;

    float twinkle = uReducedMotion > 0.5
      ? 1.0
      : 0.9 + 0.1 * sin(uTime * 1.4 + aSeed);

    float mvDist = max(12.0, -mvPosition.z);
    float basePointSize = (uBaseSize + aSize * uSizeRange) * (155.0 / mvDist) * uPixelRatio;

    float scale = 1.0;
    if (isHovered > 0.5) {
      scale = uHoveredScale;
    } else if (isVisible < 0.5) {
      scale = 0.65;
    }

    gl_PointSize = clamp(basePointSize * scale, 1.6 * uPixelRatio, 56.0 * uPixelRatio);

    vColor = aColor;
    vHovered = isHovered;

    float baseAlpha = (0.48 + 0.42 * aSize) * twinkle;
    if (uSelectedIdx > -0.5) {
      // Focused view dims the background galaxy to ~15% opacity; center & neighbors are drawn bright in FocusedConstellation
      if (isSelected > 0.5) {
        vAlpha = 0.0;
      } else if (isHovered > 0.5) {
        vAlpha = 0.95;
      } else {
        vAlpha = baseAlpha * uDimmedOpacity * (isVisible > 0.5 ? 1.0 : 0.4);
      }
    } else if (isHovered > 0.5) {
      vAlpha = 1.0;
    } else if (isVisible < 0.5) {
      vAlpha = 0.08;
    } else {
      vAlpha = baseAlpha;
    }
  }
`;

export const galaxyFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vHovered;

  void main() {
    if (vAlpha <= 0.002) discard;

    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered);
    if (dist > 0.5) discard;

    float core = smoothstep(0.16, 0.0, dist);
    float glow = exp(-dist * 7.0);
    float intensity = clamp(core * 0.85 + glow * 0.75, 0.0, 1.0);

    vec3 starColor = mix(vColor, vec3(1.0), core * 0.55);

    if (vHovered > 0.5) {
      starColor = mix(starColor, vec3(1.0), 0.35);
      intensity = clamp(intensity * 1.25, 0.0, 1.0);
    }

    gl_FragColor = vec4(starColor, intensity * vAlpha);
  }
`;

export const neighborVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aIsHovered;

  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uReducedMotion;

  varying vec3 vColor;
  varying float vHovered;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float pulse = uReducedMotion > 0.5
      ? 1.0
      : 0.92 + 0.1 * sin(uTime * 2.4 + aSeed);

    float mvDist = max(8.0, -mvPosition.z);
    float hoverBoost = aIsHovered > 0.5 ? 1.55 : 1.0;
    float pointSize = (7.2 + aSize * 3.8) * (130.0 / mvDist) * uPixelRatio * pulse * hoverBoost;

    gl_PointSize = clamp(pointSize, 6.0 * uPixelRatio, 64.0 * uPixelRatio);

    vColor = aColor;
    vHovered = aIsHovered;
  }
`;

export const neighborFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vHovered;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered);
    if (dist > 0.5) discard;

    float core = smoothstep(0.19, 0.0, dist);
    float halo = exp(-dist * 5.2);
    float intensity = clamp(core * 0.95 + halo * 0.85, 0.0, 1.0);

    vec3 color = mix(vColor, vec3(1.0), core * 0.68);
    if (vHovered > 0.5) {
      float ring = smoothstep(0.05, 0.0, abs(dist - 0.38));
      color = mix(color, vec3(1.0), 0.45) + vec3(0.55, 0.48, 1.0) * ring;
      intensity = max(intensity, ring * 0.95);
    }

    gl_FragColor = vec4(color, intensity);
  }
`;

export const centerStarVertexShader = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uReducedMotion;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float pulse = uReducedMotion > 0.5 ? 1.0 : 0.95 + 0.08 * sin(uTime * 2.1);
    float mvDist = max(8.0, -mvPosition.z);
    float pointSize = 26.0 * (130.0 / mvDist) * uPixelRatio * pulse;
    gl_PointSize = clamp(pointSize, 18.0 * uPixelRatio, 120.0 * uPixelRatio);
  }
`;

export const centerStarFragmentShader = /* glsl */ `
  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered);
    if (dist > 0.5) discard;

    float innerCore = smoothstep(0.14, 0.0, dist);
    float midGlow = exp(-dist * 5.8);
    float haloRing = smoothstep(0.045, 0.0, abs(dist - 0.30)) * 0.55;
    float outerAura = smoothstep(0.5, 0.16, dist) * 0.25;

    vec3 violetTint = vec3(0.545, 0.482, 1.0);
    vec3 color = mix(violetTint, vec3(1.0), clamp(innerCore * 0.9 + midGlow * 0.65, 0.0, 1.0));
    float alpha = clamp(innerCore + midGlow * 0.85 + haloRing + outerAura, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;
