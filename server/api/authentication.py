from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthentication(BaseJWTAuthentication):
    """
    Read JWT from Authorization header, or optional `mavuno_access` cookie (SSR / tooling).
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw = request.COOKIES.get("mavuno_access")
        if not raw:
            return None
        if isinstance(raw, str):
            raw = raw.encode("utf-8")

        try:
            validated_token = self.get_validated_token(raw)
        except TokenError as exc:
            raise InvalidToken({"detail": "Invalid token."}) from exc

        return self.get_user(validated_token), validated_token
