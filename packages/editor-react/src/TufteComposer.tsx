import type {ComponentProps,ReactNode} from 'react';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {TUFTE_NODES} from '@lexical-tufte/lexical';

type InitialConfig=ComponentProps<typeof LexicalComposer>['initialConfig'];

/**
 * Host-neutral Lexical composer for the canonical Tufte node schema.
 * The host supplies namespace, initial document state and error handling.
 *
 * This is the low-level composition boundary. TufteEditor provides the
 * separate controlled value/onChange facade on top of it.
 */
export type TufteComposerProps={
 initialConfig:Omit<InitialConfig,'nodes'>;
 children:ReactNode;
};

export function TufteComposer({initialConfig,children}:TufteComposerProps){
 return <LexicalComposer initialConfig={{...initialConfig,nodes:TUFTE_NODES}}>
  {children}
 </LexicalComposer>;
}
