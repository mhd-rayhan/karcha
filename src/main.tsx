import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { render } from 'preact';
import { App } from './app';
import './styles/globals.css';

const root = document.getElementById('app');
if (root) {
  render(
    <>
      <App />
      <Analytics />
      <SpeedInsights />
    </>,
    root,
  );
}
