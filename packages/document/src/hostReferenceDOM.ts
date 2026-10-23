import type {HostReference} from './types.js';

/** Shared DOM identity contract; neither an href nor a navigation policy. */
export const HOST_REFERENCE_CLASS='tufte-host-link' as const;
export const HOST_REFERENCE_ATTRIBUTES={
 id:'data-host-reference',
 namespace:'data-host-namespace',
 kind:'data-host-kind',
} as const;

export function hostReferenceAttributes(reference:HostReference):Record<string,string>{
 return {
  [HOST_REFERENCE_ATTRIBUTES.id]:reference.id,
  [HOST_REFERENCE_ATTRIBUTES.namespace]:reference.namespace,
  [HOST_REFERENCE_ATTRIBUTES.kind]:reference.kind,
 };
}
