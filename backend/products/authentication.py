"""
Опциональная JWT-аутентификация: невалидный или просроченный токен не даёт 401, запрос идёт как анонимный.
Нужна для POST /orders/ (оформление заказа), чтобы старый токен в localStorage не блокировал сохранение.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        raw = self.get_raw_token(header)
        if raw is None:
            return None
        try:
            validated = self.get_validated_token(raw)
            return self.get_user(validated), validated
        except (InvalidToken, TokenError):
            return None
