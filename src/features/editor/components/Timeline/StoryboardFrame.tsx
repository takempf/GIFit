import { memo } from 'react';
import styles from './StoryboardFrame.module.css';

export interface StoryboardFrameData {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
}

interface StoryboardFrameProps {
  frame: StoryboardFrameData;
  containerWidth: number;
}

export const StoryboardFrame = memo(function StoryboardFrame({
  frame,
  containerWidth
}: StoryboardFrameProps) {
  // Fit width: Scale image so frame width matches container width
  const scale = containerWidth / frame.width;
  const scaledSheetWidth = frame.sheetWidth * scale;
  const scaledSheetHeight = frame.sheetHeight * scale;

  return (
    <div
      className={styles.frame}
      style={{
        backgroundImage: `url(${frame.url})`,
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundSize: `${scaledSheetWidth}px ${scaledSheetHeight}px`,
        aspectRatio: `${frame.width} / ${frame.height}`
      }}
    />
  );
});
