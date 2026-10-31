from django.contrib import admin

from .models import ChatMessage, ChatSession


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("role", "content", "meta", "created_at")
    can_delete = False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "session_key", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("session_key", "user__email")
    inlines = [ChatMessageInline]
    readonly_fields = ("id", "created_at", "updated_at")
