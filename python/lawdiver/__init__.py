"""LawDiver API -- Python examples package (clone-and-copy; not published to PyPI)."""

from .client import DEFAULT_USER_AGENT, LawDiverApiError, LawDiverClient

__all__ = ["LawDiverClient", "LawDiverApiError", "DEFAULT_USER_AGENT"]
__version__ = "1.0.0"
