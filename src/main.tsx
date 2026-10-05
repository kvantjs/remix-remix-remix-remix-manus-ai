import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure standard React hooks and React object are globally available on window
// to prevent any 'useEffect is not defined' in dynamically evaluated runtime code
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).useEffect = React.useEffect;
  (window as any).useState = React.useState;
  (window as any).useRef = React.useRef;
  (window as any).useMemo = React.useMemo;
  (window as any).useCallback = React.useCallback;
  (window as any).useContext = React.useContext;
  (window as any).useReducer = React.useReducer;
  (window as any).useId = React.useId;
  (window as any).useLayoutEffect = React.useLayoutEffect;
}

createRoot(document.getElementById('root')!).render(<App />);
