"""Host-owned authentication and CSRF policy for the recovery API.

No permissive default is provided. Integrators must implement principal lookup,
post authorization and a mutation CSRF policy.
"""
from dataclasses import dataclass
from typing import Callable

from fastapi import Request


@dataclass(frozen=True)
class RecoverySecurity:
    """Callbacks are supplied by the deployment host, never by the client."""

    authenticated_principal: Callable[[Request], str | None]
    can_access_post: Callable[[str, str], bool]
    verify_mutation: Callable[[Request, str], bool]

    def authorize(self, request: Request, post_id: str) -> bool:
        try:
            principal = self.authenticated_principal(request)
            if not isinstance(principal, str) or not principal:
                return False
            if not self.can_access_post(principal, post_id):
                return False
            if request.method in ("PUT", "DELETE"):
                return self.verify_mutation(request, principal) is True
            return True
        except Exception:
            return False
