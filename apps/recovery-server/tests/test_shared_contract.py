"""Shared JSON fixture contract checks. Tests are intentionally not run yet."""
import hashlib
import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient
from app import create_app

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = json.loads((Path(__file__).parent / "fixtures/recovery_v1.json").read_text())
SCHEMA = ROOT / "packages/blog/sql/002_editor_recovery_v1.sql"


def test_shared_recovery_v1_fixture(tmp_path):
    db_file = tmp_path / "recovery.sqlite"
    with sqlite3.connect(db_file) as db:
        db.executescript(SCHEMA.read_text())
    client = TestClient(create_app(str(db_file), lambda request, post_id: post_id == FIXTURE["postId"]))
    base = f'/posts/{FIXTURE["postId"]}/recoveries/{FIXTURE["sessionId"]}'
    saved = client.put(base, json=FIXTURE["save"])
    assert saved.status_code == 200
    value = saved.json()["value"]
    assert value["checksum"] == hashlib.sha256(FIXTURE["save"]["payload"].encode()).hexdigest()
    assert value["sequence"] == FIXTURE["save"]["sequence"]
    conflict = client.put(base, json=FIXTURE["save"])
    assert conflict.status_code == FIXTURE["errors"]["conflict"]["status"]
    assert conflict.json()["diagnostics"][0]["code"] == FIXTURE["errors"]["conflict"]["code"]
    deleted = client.request("DELETE", base, json=FIXTURE["delete"])
    assert deleted.status_code == 200
    assert deleted.json()["value"] is True
