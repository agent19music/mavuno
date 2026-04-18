"""HTTP-only refresh cookie settings for SimpleJWT."""

import os

from django.conf import settings

REFRESH_COOKIE_NAME = "mavuno_refresh"
ACCESS_COOKIE_NAME = "mavuno_access"  # optional SSR fallback; primary flow uses Authorization header


def refresh_cookie_params():
    """Cookie flags for cross-origin refresh (Next on :3000, API on :8000)."""
    secure = os.getenv("DJANGO_REFRESH_COOKIE_SECURE")
    if secure is None:
        secure = str(not settings.DEBUG).lower()
    secure_bool = secure.lower() == "true"

    samesite = os.getenv("DJANGO_COOKIE_SAMESITE")
    if not samesite:
        samesite = "None" if secure_bool else "Lax"

    return {
        "key": REFRESH_COOKIE_NAME,
        "httponly": True,
        "secure": secure_bool,
        "samesite": samesite,
        # `/` so the browser sends the cookie on Next.js (other port) navigations too (middleware).
        "path": "/",
        "max_age": int(os.getenv("DJANGO_REFRESH_MAX_AGE", str(60 * 60 * 24 * 7))),
    }


def delete_refresh_cookie_params():
    p = refresh_cookie_params()
    return {"key": p["key"], "path": p["path"], "samesite": p["samesite"]}


def set_refresh_cookie(response, refresh_token_str: str):
    p = refresh_cookie_params()
    key = p.pop("key")
    response.set_cookie(key, refresh_token_str, **p)


def delete_refresh_cookie(response):
    p = delete_refresh_cookie_params()
    key = p.pop("key")
    response.delete_cookie(key, **p)
