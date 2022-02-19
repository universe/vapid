import './index.css';

import { JSX } from 'preact';
import { useState } from 'preact/hooks';

function splitText(text: string) {
  const d = 40;
  let idx = 0;
  const spans: JSX.Element[] = [];
  for (const char of text) {
    spans.push(<span style={`white-space: pre; --d: ${idx * d}ms; --ds: ${text.length * d - d - idx * d}ms`}>{char}</span>);
    idx++;
  }
  return spans;
}

export default function RocketButton({ onClick }: { onClick: () => any}) {
  const [ phase, setPhase ] = useState<'default' | 'animated' | 'live'>('default');

  return <button class={`rocket-button rocket-button--${phase}`} onClick={(evt) => {
    evt.preventDefault();
    setPhase(phase === 'live' ? 'default' : 'live');
    onClick();
  }}>
    <div class="default">{splitText('Deploy Site')}</div>

    <div class="success">
      <svg><use xlinkHref="#check" /></svg>
      <div>{splitText('Site is Deployed')}</div>
    </div>

    <div class="animation">
      <div class="rocket"> <svg><use xlinkHref="#rocket" /></svg></div>
      <div class="smoke"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>

    <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 11" id="check">
        <polyline stroke="currentColor" points="1 5.5 5 9.5 12 1.5"></polyline>
      </symbol>
      <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" id="rocket">
        <path d="M12,0 C18.6666667,8.70175439 19.7777778,19.0350877 15.3333333,31 L8.66666667,31 C4.22222222,19.0350877 5.33333333,8.70175439 12,0 Z" fill="var(--rocket)"></path>
        <path d="M12,0 C5.33333333,8.70175439 4.22222222,19.0350877 8.66666667,31 C6.72222222,17.9473684 7.83333333,7.61403509 12,0 Z" fill="var(--rocket-shadow-left)"></path>
        <path d="M12,0 C18.6666667,8.70175439 19.7777778,19.0350877 15.3333333,31 C17.2777778,17.9473684 16.1666667,7.61403509 12,0 Z" fill="var(--rocket-shadow-right)"></path>
        <path d="M22.2399372,27.25 C21.2403105,25.558628 19.4303122,23.808628 16.21,22 L15,31 L17.6512944,31 C18.2564684,31 18.8216022,31.042427 19.1572924,31.5292747 L21.7379379,35.271956 C22.0515593,35.7267976 22.5795404,36 23.1449294,36 C23.5649145,36 23.9142153,35.7073938 23.9866527,35.3215275 L24,35.146217 L23.9987214,35.1196135 C23.7534506,31.4421183 23.1671892,28.8189138 22.2399372,27.25 Z" fill="var(--rocket-wing-right)"></path>
        <path d="M1.76006278,27.25 C2.75968951,25.558628 4.56968777,23.808628 7.79,22 L9,31 L6.34870559,31 C5.74353157,31 5.17839777,31.042427 4.84270762,31.5292747 L2.2620621,35.271956 C1.94844071,35.7267976 1.42045963,36 0.855070627,36 C0.435085457,36 0.0857846604,35.7073938 0.0133472633,35.3215275 L0,35.146217 L0.00127855763,35.1196135 C0.24654935,31.4421183 0.832810758,28.8189138 1.76006278,27.25 Z" fill="var(--rocket-wing-left)"></path>
        <circle fill="var(--rocket-window-shadow)" cx="12" cy="12" r="3"></circle>
        <circle fill="var(--rocket-window)" cx="12" cy="12" r="2.5"></circle>
        <path d="M15.6021597,5.99977504 L8.39784027,5.99977504 C8.54788101,5.6643422 8.70496315,5.3309773 8.86908669,4.99968036 L15.1309133,4.99968036 C15.2950369,5.3309773 15.452119,5.6643422 15.6021597,5.99977504 Z" fill-opacity="0.3" fill="var(--rocket-line)"></path>
      </symbol>
    </svg>
  </button>
}
