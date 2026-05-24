import { useCallback, useRef } from 'react';
import { useConfigurationPanelStore } from '@shared/features/editor/stores/configurationPanelStore';
import css from './CropOverlay.module.css';

type DragMode =
  | 'move'
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'
  | null;

interface CropOverlayProps {
  /** Rendered width of the preview image in CSS pixels */
  displayWidth: number;
  /** Rendered height of the preview image in CSS pixels */
  displayHeight: number;
}

const MIN_CROP = 32;

export function CropOverlay({
  displayWidth,
  displayHeight
}: CropOverlayProps) {
  const videoWidth = useConfigurationPanelStore((s) => s.videoWidth);
  const videoHeight = useConfigurationPanelStore((s) => s.videoHeight);
  const cropX = useConfigurationPanelStore((s) => s.cropX);
  const cropY = useConfigurationPanelStore((s) => s.cropY);
  const cropW = useConfigurationPanelStore((s) => s.cropW);
  const cropH = useConfigurationPanelStore((s) => s.cropH);
  const handleCropChange = useConfigurationPanelStore(
    (s) => s.handleCropChange
  );

  const dragRef = useRef<{
    mode: DragMode;
    startMouseX: number;
    startMouseY: number;
    startCropX: number;
    startCropY: number;
    startCropW: number;
    startCropH: number;
  } | null>(null);

  // Scale factors: display pixels -> source-video pixels
  const scaleX = videoWidth / displayWidth;
  const scaleY = videoHeight / displayHeight;

  // Convert crop from source-video space to display space
  const dispCropX = cropX / scaleX;
  const dispCropY = cropY / scaleY;
  const dispCropW = cropW / scaleX;
  const dispCropH = cropH / scaleY;

  const clampCrop = useCallback(
    (x: number, y: number, w: number, h: number) => {
      let cx = Math.max(0, x);
      let cy = Math.max(0, y);
      let cw = Math.max(MIN_CROP, w);
      let ch = Math.max(MIN_CROP, h);

      // Clamp dimensions to not exceed video bounds
      if (cw > videoWidth) cw = videoWidth;
      if (ch > videoHeight) ch = videoHeight;

      // Clamp origin so crop stays within video
      if (cx + cw > videoWidth) cx = videoWidth - cw;
      if (cy + ch > videoHeight) cy = videoHeight - ch;
      if (cx < 0) cx = 0;
      if (cy < 0) cy = 0;

      return { cropX: cx, cropY: cy, cropW: cw, cropH: ch };
    },
    [videoWidth, videoHeight]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragRef.current = {
        mode,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startCropX: cropX,
        startCropY: cropY,
        startCropW: cropW,
        startCropH: cropH
      };
    },
    [cropX, cropY, cropW, cropH]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      const { mode, startMouseX, startMouseY, startCropX, startCropY, startCropW, startCropH } =
        dragRef.current;

      // Delta in display pixels, converted to source-video pixels
      const dx = (e.clientX - startMouseX) * scaleX;
      const dy = (e.clientY - startMouseY) * scaleY;

      let newX = startCropX;
      let newY = startCropY;
      let newW = startCropW;
      let newH = startCropH;

      switch (mode) {
        case 'move':
          newX = startCropX + dx;
          newY = startCropY + dy;
          break;
        case 'n':
          newY = startCropY + dy;
          newH = startCropH - dy;
          break;
        case 's':
          newH = startCropH + dy;
          break;
        case 'w':
          newX = startCropX + dx;
          newW = startCropW - dx;
          break;
        case 'e':
          newW = startCropW + dx;
          break;
        case 'nw':
          newX = startCropX + dx;
          newY = startCropY + dy;
          newW = startCropW - dx;
          newH = startCropH - dy;
          break;
        case 'ne':
          newY = startCropY + dy;
          newW = startCropW + dx;
          newH = startCropH - dy;
          break;
        case 'sw':
          newX = startCropX + dx;
          newW = startCropW - dx;
          newH = startCropH + dy;
          break;
        case 'se':
          newW = startCropW + dx;
          newH = startCropH + dy;
          break;
      }

      handleCropChange(clampCrop(newX, newY, newW, newH));
    },
    [scaleX, scaleY, handleCropChange, clampCrop]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Build the scrim as an SVG with a cutout for the crop region
  const isFullFrame =
    cropX === 0 && cropY === 0 && cropW === videoWidth && cropH === videoHeight;

  return (
    <div
      className={css.overlay}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dark scrim with cutout */}
      {!isFullFrame && (
        <svg
          className={css.scrim}
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
          preserveAspectRatio="none"
          width={displayWidth}
          height={displayHeight}
        >
          <defs>
            <mask id="crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={dispCropX}
                y={dispCropY}
                width={dispCropW}
                height={dispCropH}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#crop-mask)"
          />
        </svg>
      )}

      {/* Crop box with handles */}
      <div
        className={css.cropBox}
        style={{
          left: dispCropX,
          top: dispCropY,
          width: dispCropW,
          height: dispCropH
        }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      >
        {/* Edge handles */}
        <div
          className={css.handleN}
          onPointerDown={(e) => handlePointerDown(e, 'n')}
        />
        <div
          className={css.handleS}
          onPointerDown={(e) => handlePointerDown(e, 's')}
        />
        <div
          className={css.handleE}
          onPointerDown={(e) => handlePointerDown(e, 'e')}
        />
        <div
          className={css.handleW}
          onPointerDown={(e) => handlePointerDown(e, 'w')}
        />
        {/* Corner handles */}
        <div
          className={css.handleNW}
          onPointerDown={(e) => handlePointerDown(e, 'nw')}
        />
        <div
          className={css.handleNE}
          onPointerDown={(e) => handlePointerDown(e, 'ne')}
        />
        <div
          className={css.handleSW}
          onPointerDown={(e) => handlePointerDown(e, 'sw')}
        />
        <div
          className={css.handleSE}
          onPointerDown={(e) => handlePointerDown(e, 'se')}
        />
      </div>
    </div>
  );
}
