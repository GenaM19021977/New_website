/**
 * Страница регистрации (Register)
 * 
 * Отображает форму регистрации с полями email, password и password2 (подтверждение).
 * После успешной регистрации автоматически выполняет вход пользователя
 * и перенаправляет на главную страницу.
 */

import '../App.css';
import { Box } from "@mui/material";
import MyTextField from '../components/forms/MyTextField';
import MyPassField from '../components/forms/MyPassField';
import MyButton from '../components/forms/MyButton';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, ROUTES } from '../config/constants';

const Register = () => {
    // Хук для программной навигации
    const navigate = useNavigate();

    // Хук для управления формой (react-hook-form)
    const { handleSubmit, control } = useForm();

    /**
     * Обработчик отправки формы регистрации
     * 
     * Выполняет два последовательных запроса:
     * 1. Регистрация нового пользователя
     * 2. Автоматический вход после регистрации
     * 
     * @param {Object} data - Данные формы (email, password, password2)
     */
    const submission = (data) => {
        // Шаг 1: Регистрация нового пользователя
        api.post('register/', {
            email: data.email,
            password: data.password,
        })
            .then(() => {
                // Шаг 2: Автоматический вход пользователя после успешной регистрации
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

                // Перенаправление на главную страницу
                navigate(ROUTES.HOME);
            })
            .catch((error) => {
                // Обработка ошибок при регистрации (email уже существует и т.д.)
                console.error('Registration error:', error);
            });
    };

    return (
        <div className="myBackground">
            <form onSubmit={handleSubmit(submission)}>
                <Box className={"whiteBox"}>

                    <Box className={"itemBox"}>
                        <Box className={"title"}>User registration</Box>
                    </Box>

                    <Box className={"itemBox"}>
                        <MyTextField
                            label={"Email"}
                            name={"email"}
                            control={control}
                        />
                    </Box>

                    <Box className={"itemBox"}>
                        <MyPassField
                            label={"Password"}
                            name={"password"}
                            control={control}
                        />
                    </Box>

                    <Box className={"itemBox"}>
                        <MyPassField
                            label={"Confirm password"}
                            name={"password2"}
                            control={control}
                        />
                    </Box>

                    <Box className={"itemBox"}>
                        <MyButton
                            type={"submit"}
                            label={"Register"}
                        />
                    </Box>

                    <Box className={"itemBox"}>
                        <Link
                            to={ROUTES.LOGIN}
                            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                        >
                            Already registered? Please login!
                        </Link>
                    </Box>

                </Box>
            </form>
        </div>
    );
};

export default Register;

