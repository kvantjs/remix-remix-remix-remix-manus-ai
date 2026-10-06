import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure standard React hooks and React object are globally available on window
// to prevent any 'useEffect is not defined' in dynamically evaluated runtime code
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.React = React;
  // @ts-ignore
  window.useEffect = React.useEffect;
  // @ts-ignore
  window.useState = React.useState;
  // @ts-ignore
  window.useRef = React.useRef;
  // @ts-ignore
  window.useMemo = React.useMemo;
  // @ts-ignore
  window.useCallback = React.useCallback;
  // @ts-ignore
  window.useContext = React.useContext;
  // @ts-ignore
  window.useReducer = React.useReducer;
  // @ts-ignore
  window.useId = React.useId;
  // @ts-ignore
  window.useLayoutEffect = React.useLayoutEffect;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(React.createElement(App));
}
