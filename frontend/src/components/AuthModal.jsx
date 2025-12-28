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
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import { useForm } from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import { useNavigate } from 'react-router-dom';
import './AuthModal.css';

const AuthModal = ({ open, onClose }) => {
    // Состояние активной вкладки (0 - Авторизация, 1 - Регистрация)
    const [activeTab, setActiveTab] = useState(0);

    // Хук для программной навигации
    const navigate = useNavigate();

    // Хук для управления формой (react-hook-form)
    const { handleSubmit, control, reset } = useForm();

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
        setActiveTab(0); // Возврат к первой вкладке
        onClose();
    };

    /**
     * Обработчик отправки формы авторизации
     * 
     * @param {Object} data - Данные формы (email, password)
     */
    const handleLogin = (data) => {
        AxiosInstance.post('login/', {
            email: data.email,
            password: data.password,
        })
            .then((response) => {
                console.log(response);

                // Сохранение JWT токенов в localStorage
                if (response.data.access) {
                    localStorage.setItem('access_token', response.data.access);
                }
                if (response.data.refresh) {
                    localStorage.setItem('refresh_token', response.data.refresh);
                }

                // Закрытие модального окна и обновление страницы
                handleClose();

                // Перенаправление на главную страницу
                navigate('/home');
                window.location.reload(); // Перезагрузка для обновления состояния авторизации
            })
            .catch((error) => {
                console.error('Login error:', error);
            });
    };

    /**
     * Обработчик отправки формы регистрации
     * 
     * @param {Object} data - Данные формы (email, password, password2)
     */
    const handleRegister = (data) => {
        // Проверка совпадения паролей
        if (data.password !== data.password2) {
            alert('Пароли не совпадают');
            return;
        }

        // Шаг 1: Регистрация нового пользователя
        AxiosInstance.post('register/', {
            email: data.email,
            password: data.password,
        })
            .then(() => {
                // Шаг 2: Автоматический вход после регистрации
                return AxiosInstance.post('login/', {
                    email: data.email,
                    password: data.password,
                });
            })
            .then((response) => {
                // Сохранение JWT токенов в localStorage
                if (response.data.access) {
                    localStorage.setItem('access_token', response.data.access);
                }
                if (response.data.refresh) {
                    localStorage.setItem('refresh_token', response.data.refresh);
                }

                // Закрытие модального окна
                handleClose();

                // Перенаправление на главную страницу
                navigate('/home');
                window.location.reload(); // Перезагрузка для обновления состояния авторизации
            })
            .catch((error) => {
                console.error('Registration error:', error);
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
                                <MyPassField
                                    label="Confirm password"
                                    name="password2"
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
