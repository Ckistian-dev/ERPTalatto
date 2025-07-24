# core/limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

# Esta linha cria a variável 'limiter' que será importada
limiter = Limiter(key_func=get_remote_address)