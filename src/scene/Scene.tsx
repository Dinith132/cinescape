import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CONFIG } from '../config';
import { useFocusedLayout } from '../hooks/useFocusedLayout';
import { useStore } from '../store/useStore';
import { CameraRig } from './CameraRig';
import { FocusedConstellation } from './FocusedConstellation';
import { GalaxyPoints } from './GalaxyPoints';
import { PointPicker } from './PointPicker';

interface WebGLProbeResult {
  available: boolean;
  isSoftwareGl: boolean;
  isLowPower: boolean;
}

function probeGraphicsEnvironment(): WebGLProbeResult {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { available: false, isSoftwareGl: false, isLowPower: true };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { available: false, isSoftwareGl: false, isLowPower: true };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererParam = debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererName = String(gl.getParameter(rendererParam) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
    const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX;
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
    const isLowPower =
      isSoftwareGl ||
      isMobile ||
      (typeof cores === 'number' && cores > 0 && cores <= CONFIG.LOW_POWER_CORES_THRESHOLD);

    return { available: true, isSoftwareGl, isLowPower };
  } catch {
    return { available: false, isSoftwareGl: false, isLowPower: true };
  }
}

export function Scene() {
  const setWebglAvailable = useStore((s) => s.setWebglAvailable);
  const focusedLayout = useFocusedLayout();
  const [contextLost, setContextLost] = useState(false);

  const probe = useMemo(() => probeGraphicsEnvironment(), []);

  useEffect(() => {
    setWebglAvailable(probe.available);
  }, [probe.available, setWebglAvailable]);

  const dpr = useMemo(() => {
    if (probe.isSoftwareGl) return 1;
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    if (probe.isLowPower) {
      const isMobile =
        typeof window !== 'undefined' && window.innerWidth < CONFIG.MOBILE_BREAKPOINT_PX;
      const cap = isMobile
        ? Math.min(CONFIG.MAX_DPR_MOBILE, CONFIG.LOW_POWER_MAX_DPR)
        : CONFIG.LOW_POWER_MAX_DPR;
      return Math.min(deviceDpr, cap);
    }
    return Math.min(deviceDpr, CONFIG.MAX_DPR_DESKTOP);
  }, [probe.isSoftwareGl, probe.isLowPower]);

  if (!probe.available) {
    return null;
  }

  return (
    <div className="relative w-full h-full bg-[#07080f] overflow-hidden">
      {/* Subtle atmospheric violet & blue nebula glow behind WebGL canvas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 123, 255, 0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute left-[22%] top-[28%] w-[520px] h-[520px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(77, 150, 255, 0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-[18%] bottom-[22%] w-[480px] h-[480px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(46, 196, 182, 0.06) 0%, transparent 70%)' }}
        />
      </div>

      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#07080f]/80">
          <div className="glass-panel px-6 py-4 text-center max-w-sm">
            <p className="font-display text-base font-semibold text-[#eef0f6]">
              Graphics context paused
            </p>
            <p className="mt-1 text-sm text-[#8b93a7]">
              Restoring the 3D galaxy view automatically, or switch to List view above.
            </p>
          </div>
        </div>
      )}

      <Canvas
        dpr={dpr}
        camera={{
          fov: CONFIG.CAMERA_FOV,
          near: CONFIG.CAMERA_NEAR,
          far: CONFIG.CAMERA_FAR,
          position: [...CONFIG.DEFAULT_CAMERA_POS],
        }}
        gl={{
          antialias: !probe.isLowPower,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          dom.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <GalaxyPoints />
        {focusedLayout && <FocusedConstellation layout={focusedLayout} />}
        <PointPicker focusedLayout={focusedLayout} />
        <CameraRig isSoftwareGl={probe.isSoftwareGl} />
      </Canvas>
    </div>
  );
}
