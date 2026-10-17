"""HTTP v1 contract checks. Run later with pytest; not part of CI."""
import hashlib
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient
from app import create_app

SCHEMA = Path(__file__).resolve().parents[3] / "packages/blog/sql/002_editor_recovery_v1.sql"
BASE = "/posts/post-1/recoveries"
PAYLOAD = '{"draft":true}'


def setup(tmp_path, allow=True):
    db_path = tmp_path / "recovery.sqlite"
    with sqlite3.connect(db_path) as db:
        db.executescript(SCHEMA.read_text())
    app = create_app(str(db_path), lambda request, post_id: allow and post_id == "post-1")
    return TestClient(app)


def draft(**changes):
    data = dict(postId="post-1", sessionId="session-1", sequence=1,
                expectedSequence=0, baseRevision=0, savedAt="2026-10-17T09:00:00Z",
                payload=PAYLOAD)
    data.update(changes)
    return data


def test_contract_roundtrip_and_cas(tmp_path):
    client = setup(tmp_path)
    saved = client.put(BASE + "/session-1", json=draft())
    assert saved.status_code == 200
    assert saved.headers["cache-control"] == "no-store"
    assert saved.json()["value"]["checksum"] == hashlib.sha256(PAYLOAD.encode()).hexdigest()
    listed = client.get(BASE)
    assert listed.status_code == 200
    assert len(listed.json()["value"]) == 1
    assert "payload" not in listed.json()["value"][0]
    assert client.get(BASE + "/session-1").json()["value"]["payload"] == PAYLOAD
    conflict = client.delete(BASE + "/session-1", json={"expectedSequence": 2})
    assert conflict.status_code == 409
    assert conflict.json()["diagnostics"][0]["code"] == "RECOVERY_CONFLICT"
    assert client.delete(BASE + "/session-1", json={"expectedSequence": 1}).json()["value"] is True
    assert client.get(BASE + "/session-1").json()["value"] is None


def test_contract_rejects_bad_inputs_and_denies_access(tmp_path):
    client = setup(tmp_path)
    assert client.put(BASE + "/session-1", json=draft(checksum="forged")).status_code == 400
    assert client.put(BASE + "/session-1", json=draft(savedAt="not-a-date")).status_code == 400
    assert client.put(BASE + "/session-1", json=draft(sessionId="session-2")).status_code == 400
    assert client.put(BASE + "/session-1", json=draft(payload="not-json")).json()["diagnostics"][0]["code"] == "INVALID_RECOVERY_JSON"
    assert client.get(BASE).json()["value"] == []
    denied = create_app(str(tmp_path / "recovery.sqlite"), lambda request, post_id: False)
    denied_client = TestClient(denied)
    result = denied_client.get(BASE)
    assert result.status_code == 403
    assert result.json()["ok"] is False

def test_contract_rejects_content_type_and_oversized_body(tmp_path):
    client = setup(tmp_path)
    wrong_type = client.put(BASE + "/session-1", content=b'{}',
                            headers={"content-type": "text/plain"})
    assert wrong_type.status_code == 415
    assert wrong_type.json()["diagnostics"][0]["code"] == "RECOVERY_CONTENT_TYPE_UNSUPPORTED"
    huge = client.put(BASE + "/session-1", content=b'x' * 2_100_001,
                      headers={"content-type": "application/json"})
    assert huge.status_code == 413
    assert huge.json()["diagnostics"][0]["code"] == "RECOVERY_REQUEST_TOO_LARGE"
