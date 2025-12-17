from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from .serializers import *
from .models import *
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

User = get_user_model()


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """
    Endpoint для регистрации пользователя
    Принимает email и password, создает нового пользователя
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()  # Сохраняем пользователя в БД
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """
    Endpoint для входа пользователя
    Принимает email и password, возвращает JWT токены
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email и password обязательны'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Аутентификация пользователя по email и password
    user = authenticate(request, username=email, password=password)
    
    if user is not None:
        # Генерируем JWT токены
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    else:
        return Response(
            {'error': 'Неверный email или password'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
