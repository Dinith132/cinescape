import { LocateFixed, Minus, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Controls() {
  const triggerZoomIn = useStore((s) => s.triggerZoomIn);
  const triggerZoomOut = useStore((s) => s.triggerZoomOut);
  const triggerResetCamera = useStore((s) => s.triggerResetCamera);

  return (
    <div
      role="group"
      aria-label="Camera controls"
      className="pointer-events-auto glass-panel p-1 flex flex-col items-center gap-1"
    >
      <button
        type="button"
        onClick={triggerZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={triggerZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8b93a7] hover:text-[#eef0f6] hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="w-5 h-px bg-white/10 my-0.5" aria-hidden="true" />
      <button
        type="button"
        onClick={triggerResetCamera}
        title="Reset camera view"
        aria-label="Reset camera view"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8b7bff] hover:text-[#eef0f6] hover:bg-[#8b7bff]/20 transition-colors cursor-pointer"
      >
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  );
}
