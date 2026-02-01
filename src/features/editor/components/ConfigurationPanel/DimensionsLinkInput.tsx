import React from 'react';
import { useConfigurationPanelStore } from '@/features/editor/stores/configurationPanelStore';
import { ButtonToggle } from '@/components/ui/ButtonToggle/ButtonToggle';
import LinkIcon from '@/assets/link.svg?react';
import LinkEmptyIcon from '@/assets/link-empty.svg?react';
import css from './ConfigurationPanel.module.css';

export function DimensionsLinkInput() {
  const linkDimensions = useConfigurationPanelStore(
    (state) => state.linkDimensions
  );
  const storeHandleInputChange = useConfigurationPanelStore(
    (state) => state.handleInputChange
  );

  function handleLinkToggleChange(isLinked: boolean) {
    storeHandleInputChange({
      name: 'linkDimensions',
      value: isLinked
    });
  }

  return (
    <div className={css.linkDimensions}>
      <ButtonToggle
        name="linkDimensions"
        size="x-small"
        rounded={true}
        variant="input"
        padding="small"
        evenPadding={true}
        checked={linkDimensions}
        onChange={handleLinkToggleChange}
        data-testid="dimensions-link-toggle">
        {linkDimensions ? (
          <LinkIcon className={css.linkIcon} />
        ) : (
          <LinkEmptyIcon className={css.linkIcon} />
        )}
      </ButtonToggle>
    </div>
  );
}
