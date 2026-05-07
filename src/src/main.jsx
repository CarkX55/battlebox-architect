import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('🏁 [MAIN] Iniciando montaje...');

const container = document.getElementById('root');

if (!container) {
  console.error('❌ Error: No se encontró el elemento #root en el DOM');
} else {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ [MAIN] Render disparado');
  } catch (err) {
    console.error('❌ Error fatal durante el montaje:', err);
    container.innerHTML = `
      <div style="padding: 20px; color: white; background: #701b1b; border: 2px solid red;">
        <h2>Error de Inicialización</h2>
        <pre>${err.message}</pre>
        <p>Revisa la consola para más detalles.</p>
      </div>
    `;
  }
}