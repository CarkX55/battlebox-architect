import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 [MAIN V2] Cargando App...');

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ [MAIN V2] Renderizado disparado');
} else {
  console.error('❌ [MAIN V2] No root element found');
}
