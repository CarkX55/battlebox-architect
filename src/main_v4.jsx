import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('🚀 [MAIN] Cargando App...');

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ [MAIN] Renderizado disparado');
} else {
  console.error('❌ [MAIN] No root element found');
}