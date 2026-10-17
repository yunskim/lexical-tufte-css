"""Security policy regressions; intentionally not executed yet."""
from types import SimpleNamespace

from security import RecoverySecurity


def request(method):
    return SimpleNamespace(method=method)


def test_denies_anonymous_and_foreign_posts():
    anonymous = RecoverySecurity(lambda req: None, lambda user, post: True, lambda req, user: True)
    assert anonymous.authorize(request("GET"), "post-1") is False
    foreign = RecoverySecurity(lambda req: "alice", lambda user, post: False, lambda req, user: True)
    assert foreign.authorize(request("GET"), "post-1") is False


def test_requires_csrf_on_mutations_only():
    policy = RecoverySecurity(lambda req: "alice", lambda user, post: True, lambda req, user: False)
    assert policy.authorize(request("GET"), "post-1") is True
    assert policy.authorize(request("PUT"), "post-1") is False
    assert policy.authorize(request("DELETE"), "post-1") is False


def test_fail_closed_when_callback_raises():
    def broken(*args):
        raise RuntimeError("security provider unavailable")
    policy = RecoverySecurity(lambda req: "alice", broken, lambda req, user: True)
    assert policy.authorize(request("GET"), "post-1") is False
