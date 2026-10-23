export * from './types.js';
export {DOCUMENT_SCHEMA_VERSION,DOCUMENT_LIMITS,NODE_SCHEMA,isIdentifier,isSafeURL,isEmbedURL} from './schema.js';
export {validateDocument,parseDocument} from './validate.js';
export {validateMetadata,validatePostRecord,validatePostRecordV2,type PostRecordV2,isTimestamp} from './metadata.js';
export {canonicalizeDocument,parseCanonicalDocument} from './canonical.js';
export {assertStorageId,postStorageKey,slugCollisionKey,assertUniqueSlugs} from './storageKeys.js';
export {documentToEditorJSON,editorJSONToDocument} from './editorBoundary.js';
export {inspectStoredDocument,type StoredFormat,type FormatInspection} from './inspectStoredDocument.js';
export {validateDocumentV2,type TufteDocumentV2,type V2ValidationResult} from './validateV2.js';
export {migrateStoredDocument,type MigrationResult} from './migrateStoredDocument.js';
export {preparePostRevisionV2,type RevisionDecision} from './revision.js';
export {InMemoryPostRevisionStoreV2,type PostRevisionStoreV2} from './revisionStore.js';
export {SqlitePostRevisionStoreV2,type SqliteDatabase,type SqliteStatement} from './sqliteRevisionStore.js';
export {createPostBackupV2,inspectPostBackupV2,restorePostBackupV2,type PostBackupV2} from './backup.js';
export {readSqlitePostSnapshotV2,type SqliteReadDatabase,type SqliteReadStatement} from './sqliteSnapshot.js';
export {HOST_REFERENCE_CLASS,HOST_REFERENCE_ATTRIBUTES,hostReferenceAttributes} from './hostReferenceDOM.js';

/** Accessible labels for note toggles shared by editor and published HTML. */
export const NOTE_TOGGLE_ACCESSIBLE_NAME={sidenote:'Toggle sidenote',marginnote:'Toggle marginnote'} as const;
