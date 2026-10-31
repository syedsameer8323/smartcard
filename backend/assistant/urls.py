from django.urls import path

from .views import ChatHistoryView, ChatView

urlpatterns = [
    path("assistant/chat/", ChatView.as_view()),
    path("assistant/history/", ChatHistoryView.as_view()),
]
