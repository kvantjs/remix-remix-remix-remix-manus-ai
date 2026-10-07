import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface CodeMirrorSurfaceProps {
  value: string;
  className?: string;
}

export default function CodeMirrorSurface({ value, className = '' }: CodeMirrorSurfaceProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={vscodeDark}
      extensions={[javascript({ jsx: true, typescript: true })]}
      readOnly
      editable={false}
      className={className}
    />
  );
}
