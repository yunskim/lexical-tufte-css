import type {SVGProps} from 'react';

export type ToolbarIconName = 'bold'|'italic'|'code'|'quote'|'epigraph'|'sidenote'|'marginnote'|'rule'|'undo'|'redo'|'list'|'numbered'|'definition'|'attribution'|'figure'|'underline'|'strike'|'highlight';

const paths: Record<ToolbarIconName,string> = {
 bold:'M7 4h6a4 4 0 0 1 0 8H7zm0 8h7a4 4 0 0 1 0 8H7z',
 italic:'M10 4h10M4 20h10M14 4 10 20',
 code:'m8 8-4 4 4 4m8-8 4 4-4 4m-3-12-2 16',
 quote:'M4 11h7v8H4v-8zm0 0V9a5 5 0 0 1 5-5m4 7h7v8h-7v-8zm0 0V9a5 5 0 0 1 5-5',
 epigraph:'M4 5h16M4 10h11M4 15h16M4 20h11',
 sidenote:'M4 5h10M4 10h10M4 15h10m6-8h4v10h-4',
 marginnote:'M4 5h16M4 10h11M4 15h11m5-3h4v8h-4',
 rule:'M3 12h18',
 undo:'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12',
 redo:'m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12',
 list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
 numbered:'M8 6h13M8 12h13M8 18h13M3 5h1v4M3 13h2l-2 3h2',
 definition:'M4 5h16M4 10h10M7 15h13M7 20h10',
 attribution:'M5 5h14M5 10h14M10 16h9M10 20h9',
 figure:'M3 4h18v16H3zM7 15l4-4 3 3 2-2 4 4M8 8h.01',
 underline:'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
 strike:'M4 12h16M7 7a5 5 0 0 1 10 0M7 17a5 5 0 0 0 10 0',
 highlight:'M5 17 15 7l4 4-10 10H5z'
};

export function ToolbarIcon({name,...props}:{name:ToolbarIconName}&SVGProps<SVGSVGElement>){
 return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d={paths[name]}/></svg>;
}
