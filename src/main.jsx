import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './styles.css?inline';
import bricolageFontStyles from '@fontsource-variable/bricolage-grotesque/index.css?inline';
import dmSansFontStyles from '@fontsource-variable/dm-sans/index.css?inline';
import App from './App';

const stylesheet = document.createElement('style');
stylesheet.textContent = `${bricolageFontStyles}\n${dmSansFontStyles}\n${styles}`;
document.head.append(stylesheet);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
