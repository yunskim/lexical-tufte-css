"""Production host wiring: fail closed unless all security providers are installed.

This module deliberately does not invent a login system or a default principal.
Configure the application in the embedding host with its actual session and ACL services.
"""
from dataclasses import dataclass
from typing import Callable

from fastapi import FastAPI, Request

from app import create_app
from security import RecoverySecurity


@dataclass(frozen=True)
class RecoveryHostConfig:
    database_path: str
    authenticated_principal: Callable[[Request], str | None]
    can_access_post: Callable[[str, str], bool]
    verify_origin_and_csrf: Callable[[Request, str], bool]


def build_recovery_app(config: RecoveryHostConfig) -> FastAPI:
    if not config.database_path or not all(callable(item) for item in (
        config.authenticated_principal,
        config.can_access_post,
        config.verify_origin_and_csrf,
    )):
        raise ValueError("Recovery host requires database and all security providers")
    policy = RecoverySecurity(
        authenticated_principal=config.authenticated_principal,
        can_access_post=config.can_access_post,
        verify_mutation=config.verify_origin_and_csrf,
    )
    return create_app(config.database_path, policy.authorize)
