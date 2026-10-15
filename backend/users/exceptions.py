import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    """Uniform error shape: {"message": "...", "errors": {...}}. Never leaks tracebacks."""
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error")
        return Response({"message": "Something went wrong. Please try again."}, status=500)

    data = response.data
    if response.status_code == 400 and isinstance(data, dict):
        errors = {k: v if isinstance(v, list) else [v] for k, v in data.items()}
        general = errors.pop("non_field_errors", None)
        message = general[0] if general else "Please correct the highlighted fields."
        response.data = {"message": str(message), "errors": errors}
    elif isinstance(data, dict) and "detail" in data:
        response.data = {"message": str(data["detail"])}
    return response
