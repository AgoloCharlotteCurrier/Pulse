"""Vercel catch-all route – delegates every /api/* request to the FastAPI app."""

from index import app  # noqa: F401
