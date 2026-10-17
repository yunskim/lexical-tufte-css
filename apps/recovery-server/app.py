"""Recovery API v1. Deployment MUST supply authentication, authorization and CSRF guards."""
import hashlib
import json
import re
import sqlite3
from contextlib import contextmanager
from typing import Callable

from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
MAX_SAFE = 9007199254740991


def success(value):
    return {"ok": True, "value": value, "diagnostics": []}


def failure(code: str, status: int):
    return JSONResponse(status_code=status, content={
        "ok": False, "diagnostics": [{"code": code, "path": "$.recovery", "message": code}]
    })


class RecoverySave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    postId: str
    sessionId: str
    sequence: int = Field(ge=1, le=MAX_SAFE)
    expectedSequence: int = Field(ge=0, le=MAX_SAFE)
    baseRevision: int = Field(ge=0, le=MAX_SAFE)
    savedAt: str
    payload: str


class RecoveryDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expectedSequence: int = Field(ge=1, le=MAX_SAFE)


def create_app(db_file: str, authorize: Callable[[Request, str], bool]):
    """authorize must validate authenticated caller, post access and mutation CSRF/Origin."""
    app = FastAPI()
    app.state.db_file = db_file

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        code = exc.detail if isinstance(exc.detail, str) and exc.detail.startswith('RECOVERY_') or exc.detail == 'INVALID_RECOVERY_INPUT' else 'RECOVERY_REQUEST_DENIED'
        return failure(code, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return failure('INVALID_RECOVERY_INPUT', 400)

    @app.middleware("http")
    async def no_store(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    def check(request: Request, post_id: str):
        if not IDENTIFIER.fullmatch(post_id):
            raise HTTPException(status_code=400, detail="INVALID_RECOVERY_INPUT")
        try:
            if not authorize(request, post_id):
                raise HTTPException(status_code=403, detail="RECOVERY_ACCESS_DENIED")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=403, detail="RECOVERY_ACCESS_DENIED")

    @contextmanager
    def connection():
        db = sqlite3.connect(db_file, timeout=5, isolation_level=None)
        db.row_factory = sqlite3.Row
        try:
            yield db
        finally:
            db.close()

    @app.get("/posts/{post_id}/recoveries")
    def list_recoveries(post_id: str, request: Request):
        check(request, post_id)
        try:
            with connection() as db:
                rows = db.execute("SELECT post_id,session_id,sequence,base_revision,saved_at,checksum FROM editor_recovery_v1 WHERE post_id=? ORDER BY saved_at DESC,session_id ASC", (post_id,)).fetchall()
                return success([dict(postId=r["post_id"], sessionId=r["session_id"], sequence=r["sequence"], baseRevision=r["base_revision"], savedAt=r["saved_at"], checksum=r["checksum"]) for r in rows])
        except sqlite3.Error:
            return failure("RECOVERY_STORAGE_ERROR", 503)

    @app.get("/posts/{post_id}/recoveries/{session_id}")
    def read_recovery(post_id: str, session_id: str, request: Request):
        check(request, post_id)
        if not IDENTIFIER.fullmatch(session_id):
            return failure("INVALID_RECOVERY_INPUT", 400)
        try:
            with connection() as db:
                r = db.execute("SELECT * FROM editor_recovery_v1 WHERE post_id=? AND session_id=?", (post_id, session_id)).fetchone()
                if r is None:
                    return success(None)
                if hashlib.sha256(r["payload"].encode()).hexdigest() != r["checksum"]:
                    return failure("RECOVERY_INTEGRITY_ERROR", 422)
                return success(dict(postId=r["post_id"], sessionId=r["session_id"], sequence=r["sequence"], baseRevision=r["base_revision"], savedAt=r["saved_at"], payload=r["payload"], checksum=r["checksum"]))
        except sqlite3.Error:
            return failure("RECOVERY_STORAGE_ERROR", 503)

    @app.put("/posts/{post_id}/recoveries/{session_id}")
    def save_recovery(post_id: str, session_id: str, body: RecoverySave, request: Request):
        check(request, post_id)
        if not IDENTIFIER.fullmatch(session_id) or body.postId != post_id or body.sessionId != session_id or body.sequence != body.expectedSequence + 1:
            return failure("INVALID_RECOVERY_INPUT", 400)
        try:
            timestamp = datetime.fromisoformat(body.savedAt.replace('Z', '+00:00'))
            if timestamp.tzinfo is None:
                return failure('INVALID_RECOVERY_INPUT', 400)
        except ValueError:
            return failure('INVALID_RECOVERY_INPUT', 400)
        if len(body.payload.encode()) > 2_000_000:
            return failure("INVALID_RECOVERY_INPUT", 400)
        try:
            json.loads(body.payload)
        except (ValueError, TypeError):
            return failure("INVALID_RECOVERY_JSON", 400)
        checksum = hashlib.sha256(body.payload.encode()).hexdigest()
        try:
            with connection() as db:
                db.execute("BEGIN IMMEDIATE")
                r = db.execute("SELECT sequence FROM editor_recovery_v1 WHERE post_id=? AND session_id=?", (post_id, session_id)).fetchone()
                if (r["sequence"] if r else 0) != body.expectedSequence:
                    db.execute("ROLLBACK")
                    return failure("RECOVERY_CONFLICT", 409)
                values = (body.sequence, body.baseRevision, body.savedAt, body.payload, checksum, post_id, session_id)
                if r:
                    db.execute("UPDATE editor_recovery_v1 SET sequence=?,base_revision=?,saved_at=?,payload=?,checksum=? WHERE post_id=? AND session_id=?", values)
                else:
                    db.execute("INSERT INTO editor_recovery_v1(sequence,base_revision,saved_at,payload,checksum,post_id,session_id) VALUES(?,?,?,?,?,?,?)", values)
                db.execute("COMMIT")
        except sqlite3.Error:
            return failure("RECOVERY_STORAGE_ERROR", 503)
        return success(dict(postId=post_id, sessionId=session_id, sequence=body.sequence, baseRevision=body.baseRevision, savedAt=body.savedAt, payload=body.payload, checksum=checksum))

    @app.delete("/posts/{post_id}/recoveries/{session_id}")
    def delete_recovery(post_id: str, session_id: str, body: RecoveryDelete, request: Request):
        check(request, post_id)
        if not IDENTIFIER.fullmatch(session_id):
            return failure("INVALID_RECOVERY_INPUT", 400)
        try:
            with connection() as db:
                db.execute("BEGIN IMMEDIATE")
                r = db.execute("DELETE FROM editor_recovery_v1 WHERE post_id=? AND session_id=? AND sequence=? RETURNING sequence", (post_id, session_id, body.expectedSequence)).fetchone()
                if r is None:
                    db.execute("ROLLBACK")
                    return failure("RECOVERY_CONFLICT", 409)
                db.execute("COMMIT")
                return success(True)
        except sqlite3.Error:
            return failure("RECOVERY_STORAGE_ERROR", 503)

    return app
