import { useEffect, useState, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { browser } from 'wxt/browser';

import {
  parseStoryboardSpec,
  getStoryboardFrame,
  type StoryboardLevel
} from '@/utils/storyboard';
import { StoryboardFrame } from '../TimelineStoryboardFrame/TimelineStoryboardFrame';

import css from './TimelineStoryboard.module.css';

interface TimelineStoryboardProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  totalDurationMs: number;
  pixelsPerMs: number;
}

function useStoryboardSpec(totalDurationMs: number): {
  baseUrl: string;
  levels: StoryboardLevel[];
} | null {
  const [storyboardSpec, setStoryboardSpec] = useState<{
    baseUrl: string;
    levels: StoryboardLevel[];
  } | null>(null);

  useEffect(() => {
    setStoryboardSpec(null);

    const fetchStoryboard = async (): Promise<void> => {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true
        });
        const activeTab = tabs[0];

        if (!activeTab?.id) {
          console.warn('Timeline: No active tab found');
          return;
        }

        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: 'GET_STORYBOARD'
        });

        if (response && response.spec) {
          const parsed = parseStoryboardSpec(response.spec);
          setStoryboardSpec(parsed);
        } else {
          console.warn('Timeline: No spec in response');
        }
      } catch (e) {
        console.error('Failed to fetch storyboard spec', e);
      }
    };
    fetchStoryboard();
  }, [totalDurationMs]);

  return storyboardSpec;
}

export function TimelineStoryboard({
  scrollRef,
  totalDurationMs,
  pixelsPerMs
}: TimelineStoryboardProps): React.ReactElement | null {
  const storyboardSpec = useStoryboardSpec(totalDurationMs);

  const storyboardInterval =
    storyboardSpec?.levels[storyboardSpec.levels.length - 1]?.interval || 1000;

  const storyboardCount = storyboardSpec
    ? Math.ceil(totalDurationMs / storyboardInterval)
    : 0;

  const storyboardVirtualizer = useVirtualizer({
    count: storyboardCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const start = index * storyboardInterval;
      const end = Math.min(totalDurationMs, start + storyboardInterval);
      const duration = Math.max(0, end - start);
      return duration * pixelsPerMs;
    },
    horizontal: true,
    overscan: 2
  });

  useEffect(() => {
    storyboardVirtualizer.measure();
  }, [storyboardVirtualizer, pixelsPerMs, storyboardSpec]);

  if (!storyboardSpec) return null;

  return (
    <div className={css.layer}>
      {storyboardVirtualizer.getVirtualItems().map((virtualItem) => {
        const i = virtualItem.index;
        const level = storyboardSpec.levels[storyboardSpec.levels.length - 1];
        const interval = level.interval;
        const segmentStartTimeMs = i * interval;

        if (segmentStartTimeMs >= totalDurationMs) return null;

        const frame = getStoryboardFrame(storyboardSpec, segmentStartTimeMs);
        if (!frame) return null;

        return (
          <div
            key={virtualItem.key}
            className={css.segment}
            style={{
              left: `${virtualItem.start}px`,
              width: `${virtualItem.size}px`
            }}>
            <StoryboardFrame frame={frame} />
          </div>
        );
      })}
    </div>
  );
}
