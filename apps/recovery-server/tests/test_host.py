"""Host composition regressions; not executed yet."""
import pytest

from host import RecoveryHostConfig, build_recovery_app


def test_rejects_missing_security_provider():
    with pytest.raises(ValueError):
        build_recovery_app(RecoveryHostConfig(
            database_path="recovery.sqlite",
            authenticated_principal=lambda request: "alice",
            can_access_post=lambda principal, post_id: True,
            verify_origin_and_csrf=None,
        ))


def test_rejects_missing_database_path():
    with pytest.raises(ValueError):
        build_recovery_app(RecoveryHostConfig(
            database_path="",
            authenticated_principal=lambda request: "alice",
            can_access_post=lambda principal, post_id: True,
            verify_origin_and_csrf=lambda request, principal: True,
        ))


def test_builds_app_with_explicit_security_providers():
    app = build_recovery_app(RecoveryHostConfig(
        database_path="recovery.sqlite",
        authenticated_principal=lambda request: "alice",
        can_access_post=lambda principal, post_id: True,
        verify_origin_and_csrf=lambda request, principal: True,
    ))
    assert app is not None
