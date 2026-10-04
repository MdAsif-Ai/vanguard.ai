"""Create the initial organization and admin user (development tool).

Usage (inside the API container):
    docker compose exec api python scripts/seed.py
    docker compose exec api python scripts/seed.py --email a@b.c --password s3cret

The password comes from --password, then SEED_ADMIN_PASSWORD (env); if
neither is set a random password is generated and printed once to stdout
(never logged). Prefer the environment variable on shared machines:
command-line passwords are visible in shell history.

Idempotent: exits without changes if the admin user already exists.
Development-only: do not use production credentials with this script.
"""

import argparse
import asyncio
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.security import hash_password
from app.db.database import create_db_engine, create_session_factory
from app.db.models import Organization, User, UserRole

DEFAULT_ORG_NAME = "Default Organization"


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed the initial organization and admin user.")
    parser.add_argument("--email", default=None, help="Admin email (default: SEED_ADMIN_EMAIL).")
    parser.add_argument(
        "--password", default=None, help="Admin password (default: SEED_ADMIN_PASSWORD)."
    )
    return parser.parse_args()


async def main() -> None:
    settings = get_settings()
    setup_logging(settings)
    args = _parse_args()
    email = (args.email or settings.seed_admin_email).lower()

    engine = create_db_engine(settings)
    factory = create_session_factory(engine)
    try:
        async with factory() as session:
            existing = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if existing is not None:
                print(f"Admin user already exists: {email}")
                return

            if args.password is not None:
                password, generated = args.password, False
            elif settings.seed_admin_password is not None:
                password = settings.seed_admin_password.get_secret_value()
                generated = False
            else:
                password = secrets.token_urlsafe(16)
                generated = True

            organization = await _get_or_create_organization(session)
            session.add(
                User(
                    organization_id=organization.id,
                    email=email,
                    password_hash=hash_password(password),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
            )
            await session.commit()
            print(f"Created admin user: {email} (organization: {DEFAULT_ORG_NAME})")
            if generated:
                print(f"Generated password (shown once, not logged): {password}")
    finally:
        await engine.dispose()


async def _get_or_create_organization(session: AsyncSession) -> Organization:
    organization = (
        await session.execute(select(Organization).where(Organization.name == DEFAULT_ORG_NAME))
    ).scalar_one_or_none()
    if organization is None:
        organization = Organization(name=DEFAULT_ORG_NAME)
        session.add(organization)
        await session.flush()
    return organization


if __name__ == "__main__":
    asyncio.run(main())
