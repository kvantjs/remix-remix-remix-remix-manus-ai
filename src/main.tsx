import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure standard React hooks and React object are globally available on window
// to prevent any 'useEffect is not defined' in dynamically evaluated runtime code
if (typeof window !== 'undefined') {
  window['React'] = React;
  window['useEffect'] = React.useEffect;
  window['useState'] = React.useState;
  window['useRef'] = React.useRef;
  window['useMemo'] = React.useMemo;
  window['useCallback'] = React.useCallback;
  window['useContext'] = React.useContext;
  window['useReducer'] = React.useReducer;
  window['useId'] = React.useId;
  window['useLayoutEffect'] = React.useLayoutEffect;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(React.createElement(App));
}
