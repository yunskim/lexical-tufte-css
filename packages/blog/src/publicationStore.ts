/**
 * Storage-agnostic publication persistence contract.
 *
 * Implementations may use SQLite, PostgreSQL, a remote service or a host-owned
 * coordinator. The contract requires atomic conditional transitions, not SQL.
 */
import type {PostRecordV2,Result} from '@lexical-tufte/document';
import type {PublicationSnapshot,PublicationState,PublishedSnapshot} from './publication.js';

export type PublicationCommit={
 postId:string;
 expectedDraftRevision:number;
 expectedGeneration:number;
 snapshotId:string;
 snapshot:PublicationSnapshot;
 /** The exact draft used to render and validate this snapshot. */
 expectedDraft:PostRecordV2;
};
export type PublicationRestoreCommit={
 postId:string;
 expectedGeneration:number;
 snapshotId:string;
 /** Authorization and immutable-asset checks must be completed by the host. */
};
export type PublicationUnpublishCommit={
 postId:string;
 expectedGeneration:number;
};
export type PublicationCommitResult={
 state:PublicationState;
 publication:PublishedSnapshot;
};

/**
 * Every commit is indivisible: compare all preconditions and apply the transition
 * as one operation, or apply nothing. No partial snapshot or head visibility.
 *
 * A backend without atomic CAS MUST provide a coordinator or reject writes.
 * Merely checking a generation before a non-atomic write is insufficient.
 */
export interface PublicationStore{
 readDraft(postId:string):Promise<Result<PostRecordV2>>;
 readState(postId:string):Promise<Result<PublicationState>>;
 readSnapshot(snapshotId:string):Promise<Result<PublishedSnapshot>>;
 readPublic(postId:string):Promise<Result<PublishedSnapshot>>;
 commitPublication(command:PublicationCommit):Promise<Result<PublicationCommitResult>>;
 restorePublication(command:PublicationRestoreCommit):Promise<Result<PublicationState>>;
 unpublishPublication(command:PublicationUnpublishCommit):Promise<Result<PublicationState>>;
}
