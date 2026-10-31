from __future__ import annotations

import logging
import uuid

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .llm import run_assistant, simple_keyword_fallback
from .models import ChatMessage, ChatSession

logger = logging.getLogger(__name__)


class AssistantChatThrottle(UserRateThrottle):
    scope = "assistant_chat"
    rate = "30/min"


class AssistantAnonThrottle(AnonRateThrottle):
    scope = "assistant_chat_anon"
    rate = "12/min"


class ChatView(APIView):
    """
    POST /api/assistant/chat/
    Body: {
      "message": "...",
      "conversation_id": "<uuid optional>",
      "session_key": "<optional guest key>",
      "product_ids": [1,2,3]  // recent products for suggestion context
    }

    Auth optional (JWT). Customer tools only work when authenticated.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [AssistantChatThrottle, AssistantAnonThrottle]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "message is required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(message) > 1000:
            return Response(
                {"detail": "message is too long (max 1000 characters)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation_id = request.data.get("conversation_id")
        session_key = (request.data.get("session_key") or "").strip()[:64]
        raw_ids = request.data.get("product_ids") or []
        try:
            product_ids = [int(x) for x in raw_ids if x is not None][:12]
        except (TypeError, ValueError):
            product_ids = []

        # JWTAuthentication populates request.user when a valid Bearer token is present
        user = request.user if getattr(request.user, "is_authenticated", False) else None

        session = self._get_or_create_session(conversation_id, user, session_key)
        if session is None:
            return Response(
                {"detail": "Invalid or inaccessible conversation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ChatMessage.objects.create(session=session, role=ChatMessage.ROLE_USER, content=message)

        history = list(
            session.messages.order_by("-created_at")[:20].values("role", "content")
        )
        history.reverse()
        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in history
            if m["role"] in (ChatMessage.ROLE_USER, ChatMessage.ROLE_ASSISTANT) and m["content"]
        ]

        # If UI didn't send product_ids, recover from last assistant message meta
        if not product_ids:
            last_bot = (
                session.messages.filter(role=ChatMessage.ROLE_ASSISTANT)
                .order_by("-created_at")
                .first()
            )
            if last_bot and isinstance(last_bot.meta, dict):
                product_ids = [
                    int(p["id"])
                    for p in (last_bot.meta.get("products") or [])
                    if isinstance(p, dict) and p.get("id") is not None
                ][:12]

        try:
            if getattr(settings, "LLM_API_KEY", ""):
                result = run_assistant(messages, user=user, product_ids=product_ids)
            else:
                result = simple_keyword_fallback(message, user=user, product_ids=product_ids)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Assistant failed")
            result = {
                "reply": (
                    "Something went wrong while processing your request. "
                    "Please try again, or continue shopping in the catalog."
                ),
                "products": [],
                "suggestions": ["Browse shop", "Show festival offers"],
                "error": str(exc) if settings.DEBUG else None,
            }

        reply = result.get("reply") or ""
        products = result.get("products") or []
        suggestions = result.get("suggestions") or []

        ChatMessage.objects.create(
            session=session,
            role=ChatMessage.ROLE_ASSISTANT,
            content=reply,
            meta={
                "products": [
                    {
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "sale_price": p.get("sale_price"),
                        "price": p.get("price"),
                        "image_url": p.get("image_url"),
                        "category": p.get("category"),
                        "discount_percent": p.get("discount_percent"),
                        "quantity": p.get("quantity"),
                        "line_total": p.get("line_total"),
                    }
                    for p in products[:8]
                ],
                "suggestions": suggestions,
            },
        )
        session.save(update_fields=["updated_at"])

        payload = {
            "conversation_id": str(session.id),
            "reply": reply,
            "products": products,
            "suggestions": suggestions,
            "authenticated": bool(user),
        }
        if settings.DEBUG and result.get("tool_trace"):
            payload["tool_trace"] = result["tool_trace"]
        if settings.DEBUG and result.get("error"):
            payload["debug_error"] = result["error"]
        return Response(payload)

    def _get_or_create_session(self, conversation_id, user, session_key):
        """
        Strict session isolation:
        - Authenticated user's session cannot be used by another user or by a guest.
        - Guest session cannot be used by a different guest key.
        - Logging in does NOT claim an old guest conversation (fresh start is handled on the client).
        """
        if conversation_id:
            try:
                uid = uuid.UUID(str(conversation_id))
            except (ValueError, TypeError):
                return None
            try:
                session = ChatSession.objects.get(pk=uid)
            except ChatSession.DoesNotExist:
                return None

            if session.user_id:
                # User-owned session: only that user may continue it
                if not user or session.user_id != user.id:
                    return None
            else:
                # Guest session: only continue if same session_key; never attach a logged-in user here
                if user:
                    # Authenticated user must not reuse a guest thread
                    return None
                if session_key and session.session_key and session.session_key != session_key:
                    return None
            return session

        # New session
        if user:
            return ChatSession.objects.create(user=user, session_key="")
        if not session_key:
            session_key = uuid.uuid4().hex
        return ChatSession.objects.create(user=None, session_key=session_key)


class ChatHistoryView(APIView):
    """GET /api/assistant/history/?conversation_id=..."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        conversation_id = request.query_params.get("conversation_id")
        if not conversation_id:
            return Response(
                {"detail": "conversation_id required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            uid = uuid.UUID(str(conversation_id))
            session = ChatSession.objects.get(pk=uid)
        except (ValueError, TypeError, ChatSession.DoesNotExist):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user if getattr(request.user, "is_authenticated", False) else None
        if session.user_id:
            if not user or session.user_id != user.id:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Guest sessions are not reloadable across clients for privacy
            if user:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = []
        for m in session.messages.filter(role__in=["user", "assistant"]).order_by("created_at")[:50]:
            messages.append(
                {
                    "role": m.role,
                    "content": m.content,
                    "products": (m.meta or {}).get("products") or [],
                    "suggestions": (m.meta or {}).get("suggestions") or [],
                    "created_at": m.created_at.isoformat(),
                }
            )
        return Response({"conversation_id": str(session.id), "messages": messages})
