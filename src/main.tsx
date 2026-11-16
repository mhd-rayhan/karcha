import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { render } from 'preact';
import { App } from './app';
import './styles/globals.css';

// Initialize Vercel Web Analytics & Speed Insights
inject();
injectSpeedInsights();

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
