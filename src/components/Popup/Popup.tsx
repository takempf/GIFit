import css from './Popup.module.css';

import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { browser } from 'wxt/browser';

import { useAppStore } from '@/stores/appStore';
import { useGifStore } from '@/stores/gifGeneratorStore';

import ConfigurationPanel from '../ConfigurationPanel/ConfigurationPanel';
import Progress from '../Progress/Progress';
import { Button } from '../Button/Button';
import { AppLogo } from '../AppLogo/AppLogo';
import { AppFrame } from '../AppFrame/AppFrame';

import TKLogo from '@/assets/tk.svg';

export function Popup() {
  const popupElementRef: React.RefObject<HTMLDivElement | null> = useRef(null);

  useEffect(() => {
    const popupElement = popupElementRef.current;
    if (popupElement) {
      popupElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  function handleCloseAppClick() {
    // If generating, maybe query user? For now just close popup
    window.close();
  }

  return <div ref={popupElementRef} className={css.popup}></div>;
}
