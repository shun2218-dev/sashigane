import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeBuilder } from './ThemeBuilder.tsx';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root が見つかりません');
createRoot(root).render(
  <StrictMode>
    <ThemeBuilder />
  </StrictMode>,
);
