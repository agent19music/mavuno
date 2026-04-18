"""Middleware: exempt `/api/` from CSRF (JWT + refresh cookie; no session CSRF)."""


def exempt_csrf_for_api(get_response):
    def middleware(request):
        if request.path.startswith("/api/"):
            request._dont_enforce_csrf_checks = True  # noqa: SLF001
        return get_response(request)

    return middleware
