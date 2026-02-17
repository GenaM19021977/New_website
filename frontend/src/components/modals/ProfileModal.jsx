/**
 * Компонент модального окна профиля пользователя
 * 
 * Отображает информацию о пользователе с возможностью редактирования:
 * - Аватар вверху по центру
 * - Имя и Фамилия
 * - Email с возможностью копирования
 * - Личные данные (адрес)
 * - Пароль и безопасность (смена пароля)
 * - Выход из аккаунта
 */

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import CopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import MyTextField from '../forms/MyTextField';
import MyPassField from '../forms/MyPassField';
import { STORAGE_KEYS, ROUTES, COUNTRIES } from '../../config/constants';
import { getAvatarUrl } from '../../utils/avatar';
import './ProfileModal.css';

const ProfileModal = ({ open, onClose, user, onUserUpdate }) => {
    const navigate = useNavigate();

    // Состояния для раскрывающихся секций
    const [personalDataOpen, setPersonalDataOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    // Состояние для копирования email
    const [emailCopied, setEmailCopied] = useState(false);

    // Состояние для превью аватара
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Хуки для управления формами
    const { handleSubmit: handlePersonalSubmit, control: personalControl, reset: resetPersonal } = useForm({
        defaultValues: {
            country: '',
            region: '',
            district: '',
            city: '',
            street: '',
            house_number: '',
            building_number: '',
            apartment_number: ''
        }
    });

    const { handleSubmit: handlePasswordSubmit, control: passwordControl, reset: resetPassword, watch: watchPassword } = useForm();

    // Отслеживание нового пароля для валидации подтверждения
    const newPassword = watchPassword("new_password");

    /**
     * Инициализация формы личных данных при загрузке пользователя
     */
    useEffect(() => {
        if (user) {
            resetPersonal({
                country: user.country || '',
                region: user.region || '',
                district: user.district || '',
                city: user.city || '',
                street: user.street || '',
                house_number: user.house_number || '',
                building_number: user.building_number || '',
                apartment_number: user.apartment_number || ''
            });
            if (user.avatar) {
                setAvatarPreview(getAvatarUrl(user.avatar));
            } else {
                setAvatarPreview(null);
            }
        }
    }, [user, resetPersonal]);

    /**
     * Обработчик копирования email
     */
    const handleCopyEmail = () => {
        if (user?.email) {
            navigator.clipboard.writeText(user.email);
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 2000);
        }
    };

    /**
     * Обработчик изменения аватара
     */
    const handleAvatarChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Валидация файла
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
            alert('Неподдерживаемый формат файла. Используйте JPEG, PNG, GIF или WebP.');
            // Сброс input
            event.target.value = '';
            return;
        }

        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимальный размер: 5MB.');
            // Сброс input
            event.target.value = '';
            return;
        }

        // Создание превью
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Создание FormData для отправки
        const formData = new FormData();
        formData.append('avatar', file);

        // Отправка на сервер
        try {
            // Используем PATCH для частичного обновления
            // DRF использует snake_case по умолчанию, поэтому update_profile, а не update-profile
            const response = await api.patch('me/update_profile/', formData);
            if (onUserUpdate) {
                onUserUpdate(response.data);
            }
            // Обновление превью на основе ответа сервера
            if (response.data.avatar) {
                setAvatarPreview(getAvatarUrl(response.data.avatar));
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            
            // Откат превью в случае ошибки
            if (user?.avatar) {
                setAvatarPreview(getAvatarUrl(user.avatar));
            } else {
                setAvatarPreview(null);
            }
            
            // Сброс input
            event.target.value = '';
            
            // Детальное сообщение об ошибке
            let errorMessage = 'Ошибка при обновлении аватара';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage += ': ' + error.response.data;
                } else if (error.response.data.avatar) {
                    const avatarErrors = Array.isArray(error.response.data.avatar) 
                        ? error.response.data.avatar.join(', ') 
                        : error.response.data.avatar;
                    errorMessage += ': ' + avatarErrors;
                } else if (error.response.data.detail) {
                    errorMessage += ': ' + error.response.data.detail;
                } else {
                    errorMessage += ': ' + JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMessage += ': ' + error.message;
            }
            
            alert(errorMessage);
        }
    };

    /**
     * Обработчик сохранения личных данных
     */
    const handleSavePersonalData = (data) => {
        api.patch('me/update_profile/', data)
            .then((response) => {
                if (onUserUpdate) {
                    onUserUpdate(response.data);
                }
                setPersonalDataOpen(false);
            })
            .catch((error) => {
                console.error('Error updating personal data:', error);
                if (error.response?.data) {
                    alert('Ошибка при обновлении данных: ' + JSON.stringify(error.response.data));
                } else {
                    alert('Ошибка при обновлении данных');
                }
            });
    };

    /**
     * Обработчик смены пароля
     */
    const handleChangePassword = (data) => {
        api.post('me/change_password/', {
            old_password: data.old_password,
            new_password: data.new_password,
            new_password2: data.new_password2
        })
            .then(() => {
                alert('Пароль успешно изменен');
                resetPassword();
                setPasswordOpen(false);
            })
            .catch((error) => {
                console.error('Error changing password:', error);
                if (error.response?.data) {
                    const errors = error.response.data;
                    const errorMessages = Object.entries(errors)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join('\n');
                    alert(`Ошибка при смене пароля:\n${errorMessages}`);
                } else {
                    alert('Ошибка при смене пароля');
                }
            });
    };

    /**
     * Обработчик выхода из аккаунта
     */
    const handleLogout = () => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (onClose) {
            onClose();
        }
        navigate(ROUTES.HOME);
        window.location.reload();
    };

    if (!user) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            className="profile-modal"
        >
            <DialogTitle className="profile-modal-title">
                Профиль пользователя
            </DialogTitle>

            <DialogContent className="profile-modal-content">
                <Box className="profile-header">
                    {/* Аватар */}
                    <Box className="profile-avatar-container">
                        <Avatar
                            src={avatarPreview}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="profile-avatar"
                        >
                            {!avatarPreview && ((user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'U')}
                        </Avatar>
                        <input
                            type="file"
                            accept="image/*"
                            id="avatar-upload-profile"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                        <label htmlFor="avatar-upload-profile">
                            <IconButton
                                color="primary"
                                component="span"
                                className="avatar-upload-button"
                            >
                                <PhotoCameraIcon />
                            </IconButton>
                        </label>
                    </Box>

                    {/* Имя и Фамилия */}
                    <Box className="profile-name">
                        {user.first_name} {user.last_name}
                    </Box>

                    {/* Email с кнопкой копирования */}
                    <Box className="profile-email-container">
                        <TextField
                            value={user.email || ''}
                            variant="outlined"
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="Скопировать" arrow>
                                            <IconButton
                                                onClick={handleCopyEmail}
                                                color={emailCopied ? 'success' : 'default'}
                                                edge="end"
                                            >
                                                {emailCopied ? <CheckIcon /> : <CopyIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                )
                            }}
                            className="profile-email-field"
                        />
                    </Box>
                </Box>

                {/* Личные данные */}
                <Box className="profile-section">
                    <Button
                        variant="outlined"
                        startIcon={<PersonIcon />}
                        onClick={() => setPersonalDataOpen(!personalDataOpen)}
                        className="profile-section-button"
                    >
                        Личные данные
                    </Button>
                    <Collapse in={personalDataOpen}>
                        <Box className="profile-section-content">
                            <form onSubmit={handlePersonalSubmit(handleSavePersonalData)}>
                                <Box className="profile-form-grid">
                                    <Controller
                                        name="country"
                                        control={personalControl}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                select
                                                label="Страна проживания"
                                                variant="outlined"
                                                fullWidth
                                            >
                                                {COUNTRIES.map((country) => (
                                                    <MenuItem key={country} value={country}>
                                                        {country}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />

                                    <MyTextField
                                        label="Область"
                                        name="region"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Район"
                                        name="district"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Город"
                                        name="city"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Улица"
                                        name="street"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Номер дома"
                                        name="house_number"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Номер корпуса"
                                        name="building_number"
                                        control={personalControl}
                                    />

                                    <MyTextField
                                        label="Номер квартиры"
                                        name="apartment_number"
                                        control={personalControl}
                                    />
                                </Box>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    className="profile-save-button"
                                >
                                    Сохранить
                                </Button>
                            </form>
                        </Box>
                    </Collapse>
                </Box>

                {/* Пароль и безопасность */}
                <Box className="profile-section">
                    <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => setPasswordOpen(!passwordOpen)}
                        className="profile-section-button"
                    >
                        Пароль и безопасность
                    </Button>
                    <Collapse in={passwordOpen}>
                        <Box className="profile-section-content">
                            <form onSubmit={handlePasswordSubmit(handleChangePassword)}>
                                <Box className="profile-form-vertical">
                                    <MyPassField
                                        label="Старый пароль"
                                        name="old_password"
                                        control={passwordControl}
                                        rules={{
                                            required: "Старый пароль обязателен"
                                        }}
                                    />

                                    <MyPassField
                                        label="Новый пароль"
                                        name="new_password"
                                        control={passwordControl}
                                        rules={{
                                            required: "Новый пароль обязателен",
                                            minLength: {
                                                value: 8,
                                                message: "Пароль должен содержать минимум 8 символов"
                                            }
                                        }}
                                    />

                                    <MyPassField
                                        label="Подтверждение нового пароля"
                                        name="new_password2"
                                        control={passwordControl}
                                        rules={{
                                            required: "Подтверждение пароля обязательно",
                                            validate: (value) => {
                                                return value === newPassword || "Пароли не совпадают";
                                            }
                                        }}
                                    />
                                </Box>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    className="profile-save-button"
                                >
                                    Изменить пароль
                                </Button>
                            </form>
                        </Box>
                    </Collapse>
                </Box>

                {/* Кнопка выхода */}
                <Box className="profile-section">
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<ExitToAppIcon />}
                        onClick={handleLogout}
                        className="profile-logout-button"
                        fullWidth
                    >
                        Выйти
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ProfileModal;
