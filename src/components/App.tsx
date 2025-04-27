import css from './App.module.css';

import { useAppStore } from '@/stores/appStore';

import { Popup } from './Popup/Popup';
import { log } from '@/utils/logger';

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
        <button onClick={handleClick}>GIFit</button>
      </div>
      {isOpen && <Popup />}
    </>
  );
}
