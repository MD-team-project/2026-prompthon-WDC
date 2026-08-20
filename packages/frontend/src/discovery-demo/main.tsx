import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DiscoveryDemoApp } from './DiscoveryDemoApp';
import '../styles.css';
import './discovery-demo.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root missing from discovery-demo.html');
}

createRoot(container).render(
  <StrictMode>
    <DiscoveryDemoApp />
  </StrictMode>,
);
