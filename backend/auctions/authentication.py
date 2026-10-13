from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework import permissions

class GracefulJWTAuthentication(JWTAuthentication):
    """
    JWT Authentication that doesn't fail on safe read methods (GET, HEAD, OPTIONS)
    if the provided token is expired or invalid. Instead, it falls back to
    unauthenticated (AnonymousUser) so public content like auction listings
    never crashes when a client has a stale token.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            if request.method in permissions.SAFE_METHODS:
                return None
            raise
