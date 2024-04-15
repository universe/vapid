import './index.css';

import { ComponentChildren } from 'preact';
import { useContext,useState } from 'preact/hooks';

import { WebsiteContext } from '../theme.js';

interface IDeviceFrameProps {
  children?: ComponentChildren;
}

export default function DeviceFrame({ children }: IDeviceFrameProps) {
  const [ previewLayout, setPreviewLayout ] = useState<'full' | 'desktop' | 'mobile'>('desktop');
  const { theme } = useContext(WebsiteContext);

  return <article class={`vapid-preview  ${previewLayout === 'full' ? 'vapid-preview--full-screen' : ''}`} id="preview-container">
    <div id="preview-device" class={`device ${previewLayout === 'mobile' ? 'device-iphone-x' : ''}`}>
      <div class="device-frame">{children}</div>
      <div class="device-stripe" />
      <div class="device-header" />
      <div class="device-sensors" />
      <div class="device-btns" />
      <div class="device-power" />
    </div>
    <nav class={`preview-controls preview-controls--${previewLayout}`}>
      <ul class="preview-controls__list">
        <li><button class="preview-controls__button preview-controls__button--full-screen" onClick={() => setPreviewLayout('full')}>Full Screen</button></li>
        <li>
          <button 
            onClick={() => setPreviewLayout('mobile')} 
            class={`preview-controls__button preview-controls__button--mobile ${previewLayout === 'mobile' ? 'preview-controls__button--active' : ''}`}
          >
            Mobile
          </button>
        </li>
        <li>
          <button
            onClick={() => setPreviewLayout('desktop')}
            class={`preview-controls__button preview-controls__button--desktop ${previewLayout == 'desktop' ? 'preview-controls__button--active' : ''}`}
          >
            Desktop
          </button>
        </li>
        <li><a href={`https://${theme?.meta?.domain}`} target="_blank" class="preview-controls__button preview-controls__button--breakout" rel="noreferrer">Breakout</a></li>
      </ul>
      <button class="preview-controls__exit preview-controls__button" onClick={() => setPreviewLayout('desktop')}>Exit</button>
    </nav>
  </article>;
}