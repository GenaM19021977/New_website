from rest_framework import serializers
from .models import *
from django.contrib.auth import get_user_model

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'birthday')
        read_only_fields = ('id',)

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'password')
        extra_kwargs = { 'password': {'write_only': True}}

    def create(self, validated_data):  # создает пользователя с хэшированным паролем
        user = User.objects.create_user(**validated_data)
        user.save()  # Явно сохраняем пользователя в БД
        return user    
            
