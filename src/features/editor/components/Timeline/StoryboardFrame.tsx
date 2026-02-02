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
}

export const StoryboardFrame = memo(function StoryboardFrame({
  frame
}: StoryboardFrameProps) {
  const aspectRatio = frame.width / frame.height;
  const bgImage = `url(${frame.url})`;
  const bgPosition = `${(frame.x / (frame.sheetWidth - frame.width)) * 100}% ${(frame.y / (frame.sheetHeight - frame.height)) * 100}%`;
  const bgSize = `${(frame.sheetWidth / frame.width) * 100}% ${(frame.sheetHeight / frame.height) * 100}%`;

  return (
    <div
      className={styles.frame}
      style={
        {
          '--aspect-ratio': aspectRatio,
          '--bg-image': bgImage,
          '--bg-position': bgPosition,
          '--bg-size': bgSize
        } as React.CSSProperties
      }
    />
  );
});
