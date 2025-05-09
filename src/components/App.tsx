import css from './App.module.css';

import { useAppStore } from '@/stores/appStore';

import { Popup } from './Popup/Popup';
import { AppLogo } from './AppLogo/AppLogo';
import { AppFrame } from './AppFrame/AppFrame';

import { log } from '@/utils/logger';
import { AnimatePresence } from 'motion/react';

interface AppProps {}

export function App({}: AppProps) {
  const videoElement = useAppStore((state) => state.videoElement);
  const isOpen = useAppStore((state) => state.isOpen);
  const toggle = useAppStore((state) => state.toggle);

  function handleClick() {
    toggle();
    videoElement?.pause();
    log('Pausing video');
  }

  return (
    <>
      <AnimatePresence>
        <div className={css.app}>
          {!isOpen && (
            <button className={css.gifitButton} onClick={handleClick}>
              <AppFrame>
                <AppLogo />
              </AppFrame>
            </button>
          )}
        </div>
        {isOpen && <Popup />}
      </AnimatePresence>
    </>
  );
}
