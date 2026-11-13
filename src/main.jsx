import React from 'react';
import ReactDOM from 'react-dom/client';
// globální styly musí být načteny PŘED komponentami, aby je styly sekcí mohly přepsat
import './styles/global.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
