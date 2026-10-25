import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import bricolageFont from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2';
import dmSansFont from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2';
import styles from './styles.css?inline';
import bricolageFontStyles from '@fontsource-variable/bricolage-grotesque/index.css?inline';
import dmSansFontStyles from '@fontsource-variable/dm-sans/index.css?inline';
import App from './App';
import AppErrorBoundary from './components/AppErrorBoundary';

try {
  localStorage.removeItem('jenika_token');
} catch (error) {
  console.warn('Tidak dapat menghapus token sesi versi lama dari browser.', error);
}

for (const href of [bricolageFont, dmSansFont]) {
  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'font';
  preload.type = 'font/woff2';
  preload.crossOrigin = 'anonymous';
  preload.href = href;
  document.head.append(preload);
}

const stylesheet = document.createElement('style');
stylesheet.textContent = `${bricolageFontStyles}\n${dmSansFontStyles}\n${styles}`;
document.head.append(stylesheet);

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </AppErrorBoundary>,
);
