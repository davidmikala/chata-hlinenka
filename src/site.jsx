import React from 'react';
import ReactDOM from 'react-dom/client';
// globální styly musí být načteny PŘED komponentami, aby je styly sekcí mohly přepsat
import './styles/global.css';
import App from './App.jsx';
import { loadPhotos, PhotosProvider } from './content/photos.jsx';

export default async function renderSite(root) {
  // fotky z administrace (při chybě/pomalé síti se použijí výchozí)
  const photos = await loadPhotos();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <PhotosProvider value={photos}>
        <App />
      </PhotosProvider>
    </React.StrictMode>,
  );
}
