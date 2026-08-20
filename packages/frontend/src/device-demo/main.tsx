import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DeviceDemoApp } from './DeviceDemoApp';
import '../styles.css';
import './device-demo.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root missing from device-demo.html');
}

createRoot(container).render(
  <StrictMode>
    <DeviceDemoApp />
  </StrictMode>,
);
