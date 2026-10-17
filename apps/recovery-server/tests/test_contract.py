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
    conflict = client.request("DELETE", BASE + "/session-1", json={"expectedSequence": 2})
    assert conflict.status_code == 409
    assert conflict.json()["diagnostics"][0]["code"] == "RECOVERY_CONFLICT"
    assert client.request("DELETE", BASE + "/session-1", json={"expectedSequence": 1}).json()["value"] is True
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
    assert huge.headers["cache-control"] == "no-store"
    assert huge.json()["diagnostics"][0]["code"] == "RECOVERY_REQUEST_TOO_LARGE"

def test_strict_integer_and_route_error_envelopes(tmp_path):
    client = setup(tmp_path)
    for invalid in ("1", True, 1.0):
        response = client.put(BASE + "/session-1", json=draft(sequence=invalid))
        assert response.status_code == 400
        assert response.json()["diagnostics"][0]["code"] == "INVALID_RECOVERY_INPUT"
    missing = client.get("/unknown-route")
    assert missing.status_code == 404
    assert missing.json()["diagnostics"][0]["code"] == "RECOVERY_ROUTE_NOT_FOUND"
    method = client.post(BASE)
    assert method.status_code == 405
    assert method.json()["diagnostics"][0]["code"] == "RECOVERY_METHOD_NOT_ALLOWED"

def test_unauthorized_mutation_rejected_before_body_validation(tmp_path):
    denied = TestClient(create_app(str(tmp_path / "missing.sqlite"), lambda request, post_id: False))
    response = denied.put(BASE + "/session-1", content=b'not-json',
                          headers={"content-type": "text/plain"})
    assert response.status_code == 403
    assert response.json()["diagnostics"][0]["code"] == "RECOVERY_ACCESS_DENIED"
    assert response.headers["cache-control"] == "no-store"


def test_authorization_callback_called_once(tmp_path):
    db_path = tmp_path / "recovery.sqlite"
    with sqlite3.connect(db_path) as db:
        db.executescript(SCHEMA.read_text())
    calls = []
    def authorize(request, post_id):
        calls.append((request.method, post_id))
        return True
    client = TestClient(create_app(str(db_path), authorize))
    assert client.get(BASE).status_code == 200
    assert calls == [("GET", "post-1")]

def test_streamed_oversize_without_content_length(tmp_path):
    client = setup(tmp_path)
    def chunks():
        yield b'{' + b' ' * 1_100_000
        yield b' ' * 1_100_001 + b'}'
    response = client.put(
        BASE + "/session-1", content=chunks(),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 413
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["diagnostics"][0]["code"] == "RECOVERY_REQUEST_TOO_LARGE"

def test_request_body_replay_allows_save_then_read(tmp_path):
    client = setup(tmp_path)
    response = client.put(BASE + "/session-1", json=draft())
    assert response.status_code == 200
    assert response.json()["value"]["payload"] == PAYLOAD
    fetched = client.get(BASE + "/session-1")
    assert fetched.status_code == 200
    assert fetched.json()["value"]["payload"] == PAYLOAD

def test_unknown_collection_mutation_keeps_method_error(tmp_path):
    client = setup(tmp_path)
    response = client.put(BASE, content=b'not-json',
                          headers={"content-type": "text/plain"})
    assert response.status_code == 405
    assert response.json()["diagnostics"][0]["code"] == "RECOVERY_METHOD_NOT_ALLOWED"
    assert response.headers["cache-control"] == "no-store"
