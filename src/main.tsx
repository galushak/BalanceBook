import React from 'react';import {createRoot} from 'react-dom/client';import {App} from './App';import './style.css';import {DialogProvider} from './dialogs';
createRoot(document.getElementById('root')!).render(<DialogProvider><App/></DialogProvider>);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
