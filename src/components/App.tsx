import css from './App.module.css';

import { useAppStore } from '@/stores/appStore';

import { Popup } from './Popup/Popup';
import { AppLogo } from './AppLogo/AppLogo';
import { AppFrame } from './AppFrame/AppFrame';

import { log } from '@/utils/logger';
import { AnimatePresence } from 'motion/react';

interface AppProps {}

export function App({}: AppProps) {
  const isOpen = useAppStore((state) => state.isOpen);
  const toggle = useAppStore((state) => state.toggle);

  function handleClick() {
    log('Toggle GIFit panel');
    toggle();
  }

  return (
    <>
      <div className={css.app}>
        {!isOpen && (
          <button className={css.gifitButton} onClick={handleClick}>
            <AppFrame>
              <AppLogo />
            </AppFrame>
          </button>
        )}
      </div>
      <AnimatePresence>{isOpen && <Popup />}</AnimatePresence>
    </>
  );
}
