/**
 * Компонент модального окна авторизации/регистрации
 * 
 * Отображает модальное окно с двумя вкладками:
 * 1. Авторизация - форма входа
 * 2. Регистрация - форма регистрации
 */

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import MyTextField from '../forms/MyTextField';
import MyPassField from '../forms/MyPassField';
import MyButton from '../forms/MyButton';
import { useForm, Controller } from 'react-hook-form';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, ROUTES } from '../../config/constants';
import './AuthModal.css';

const AuthModal = ({ open, onClose }) => {
    // Состояние активной вкладки (0 - Авторизация, 1 - Регистрация)
    const [activeTab, setActiveTab] = useState(0);
    
    // Состояние для превью аватара
    const [avatarPreview, setAvatarPreview] = useState(null);
    
    // Хук для программной навигации
    const navigate = useNavigate();
    
    // Хук для управления формой (react-hook-form)
    const { handleSubmit, control, reset, watch, setError } = useForm();
    
    // Отслеживание значения пароля для валидации подтверждения
    const password = watch("password");

    /**
     * Обработчик смены вкладки
     * 
     * @param {Event} event - Событие смены вкладки
     * @param {number} newValue - Индекс новой активной вкладки
     */
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        reset(); // Сброс формы при смене вкладки
    };

    /**
     * Обработчик закрытия модального окна
     */
    const handleClose = () => {
        reset(); // Сброс формы при закрытии
        setAvatarPreview(null); // Сброс превью аватара
        setActiveTab(0); // Возврат к первой вкладке
        onClose();
    };

    /**
     * Обработчик изменения файла аватара
     * 
     * @param {Event} event - Событие изменения файла
     */
    const handleAvatarChange = (event, onChange) => {
        const file = event.target.files[0];
        if (file) {
            // Создание превью аватара
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
            
            // Обновление значения в форме
            onChange(file);
        }
    };

    /**
     * Обработчик отправки формы авторизации
     * 
     * @param {Object} data - Данные формы (email, password)
     */
    const handleLogin = (data) => {
        api.post('login/', {
            email: data.email,
            password: data.password,
        })
            .then((response) => {
                console.log(response);

                // Сохранение JWT токенов в localStorage
                if (response.data.access) {
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
                }
                if (response.data.refresh) {
                    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);
                }

                // Закрытие модального окна и обновление страницы
                handleClose();

                // Перенаправление на главную страницу
                navigate(ROUTES.HOME);
                window.location.reload(); // Перезагрузка для обновления состояния авторизации
            })
            .catch((error) => {
                console.error('Login error:', error);
            });
    };

    /**
     * Обработчик отправки формы регистрации
     * 
     * @param {Object} data - Данные формы (email, password, password2, first_name, last_name, phone, avatar)
     */
    const handleRegister = (data) => {
        // Создание FormData для отправки файла
        const formData = new FormData();
        formData.append('email', data.email);
        formData.append('password', data.password);
        formData.append('password2', data.password2);
        formData.append('first_name', data.first_name.trim());
        formData.append('last_name', data.last_name.trim());
        if (data.phone) {
            formData.append('phone', data.phone);
        }
        if (data.avatar) {
            formData.append('avatar', data.avatar);
        }

        // Шаг 1: Регистрация нового пользователя
        api.post('register/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
            .then(() => {
                // Шаг 2: Автоматический вход после регистрации
                return api.post('login/', {
                    email: data.email,
                    password: data.password,
                });
            })
            .then((response) => {
                // Сохранение JWT токенов в localStorage
                if (response.data.access) {
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
                }
                if (response.data.refresh) {
                    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);
                }
                
                // Закрытие модального окна
                handleClose();
                
                // Перенаправление на главную страницу
                navigate(ROUTES.HOME);
                window.location.reload(); // Перезагрузка для обновления состояния авторизации
            })
            .catch((error) => {
                console.error('Registration error:', error);
                if (error.response?.data) {
                    // Установка ошибок валидации в форму
                    const errors = error.response.data;
                    Object.keys(errors).forEach((fieldName) => {
                        const errorMessage = Array.isArray(errors[fieldName]) 
                            ? errors[fieldName].join(', ') 
                            : errors[fieldName];
                        setError(fieldName, {
                            type: 'server',
                            message: errorMessage
                        });
                    });
                } else {
                    alert('Произошла ошибка при регистрации');
                }
            });
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            className="auth-modal"
        >
            <DialogTitle className="auth-modal-title">
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    className="auth-tabs"
                >
                    <Tab label="Авторизация" />
                    <Tab label="Регистрация" />
                </Tabs>
            </DialogTitle>

            <DialogContent className="auth-modal-content">
                {/* Вкладка Авторизация */}
                {activeTab === 0 && (
                    <form onSubmit={handleSubmit(handleLogin)}>
                        <Box className="auth-form-box">
                            <Box className="auth-field-box">
                                <MyTextField
                                    label="Email"
                                    name="email"
                                    control={control}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyPassField
                                    label="Password"
                                    name="password"
                                    control={control}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyButton
                                    type="submit"
                                    label="Войти"
                                />
                            </Box>
                        </Box>
                    </form>
                )}

                {/* Вкладка Регистрация */}
                {activeTab === 1 && (
                    <form onSubmit={handleSubmit(handleRegister)}>
                        <Box className="auth-form-box">
                            {/* Аватар */}
                            <Box className="auth-avatar-box">
                                <Controller
                                    name="avatar"
                                    control={control}
                                    render={({ field: { onChange, value, ...field } }) => (
                                        <>
                                            <Avatar
                                                src={avatarPreview}
                                                sx={{ width: 100, height: 100, margin: '0 auto' }}
                                            />
                                            <input
                                                {...field}
                                                type="file"
                                                accept="image/*"
                                                id="avatar-upload"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleAvatarChange(e, onChange)}
                                            />
                                            <label htmlFor="avatar-upload">
                                                <IconButton
                                                    color="primary"
                                                    component="span"
                                                    sx={{ display: 'block', margin: '10px auto' }}
                                                >
                                                    <PhotoCameraIcon />
                                                </IconButton>
                                            </label>
                                        </>
                                    )}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyTextField
                                    label="Email *"
                                    name="email"
                                    control={control}
                                    rules={{
                                        required: "Email обязателен для заполнения",
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "Неверный формат email"
                                        }
                                    }}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyPassField
                                    label="Пароль *"
                                    name="password"
                                    control={control}
                                    rules={{
                                        required: "Пароль обязателен для заполнения",
                                        minLength: {
                                            value: 8,
                                            message: "Пароль должен содержать минимум 8 символов"
                                        }
                                    }}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyPassField
                                    label="Подтверждение пароля *"
                                    name="password2"
                                    control={control}
                                    rules={{
                                        required: "Подтверждение пароля обязательно",
                                        validate: (value) => {
                                            return value === password || "Пароли не совпадают";
                                        }
                                    }}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyTextField
                                    label="Имя *"
                                    name="first_name"
                                    control={control}
                                    rules={{
                                        required: "Имя обязательно для заполнения",
                                        validate: (value) => {
                                            if (!value || !value.trim()) {
                                                return "Имя не может быть пустым";
                                            }
                                            return true;
                                        }
                                    }}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyTextField
                                    label="Фамилия *"
                                    name="last_name"
                                    control={control}
                                    rules={{
                                        required: "Фамилия обязательна для заполнения",
                                        validate: (value) => {
                                            if (!value || !value.trim()) {
                                                return "Фамилия не может быть пустой";
                                            }
                                            return true;
                                        }
                                    }}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyTextField
                                    label="Телефон"
                                    name="phone"
                                    control={control}
                                />
                            </Box>

                            <Box className="auth-field-box">
                                <MyButton
                                    type="submit"
                                    label="Зарегистрироваться"
                                />
                            </Box>
                        </Box>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AuthModal;
