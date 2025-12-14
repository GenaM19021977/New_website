from django.shortcuts import render
from rest_framework import viewsets, permissions
from .serializers import *
from .models import *
from rest_framework.response import Response
from django.contrib.auth import get_user_model
User = get_user_model()

# создаем набор представлений для создания, редактирования и удаления пользователей
class RegisterViewset(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()  # Сохраняем пользователя в БД
            return Response(serializer.data, status=201)  # 201 - статус успешного создания
        else:
            return Response(serializer.errors, status=400)