/**
 * Страница входа (Login)
 *
 * Отображает форму входа с полями email и password.
 * При успешной аутентификации сохраняет JWT токены в localStorage
 * и перенаправляет пользователя на главную страницу.
 */

import '../../../App.css';
import './Login.css';

import { Box } from "@mui/material";
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';

import MyTextField from '../../forms/MyTextField';
import MyPassField from '../../forms/MyPassField';
import MyButton from '../../forms/MyButton';
import api from '../../../services/api';
import { STORAGE_KEYS, ROUTES } from '../../../config/constants';

const Login = () => {
    // Хук для программной навигации
    const navigate = useNavigate();

    // Хук для управления формой (react-hook-form)
    const { handleSubmit, control } = useForm();

    /**
     * Обработчик отправки формы входа
     *
     * @param {Object} data - Данные формы (email, password)
     */
    const submission = (data) => {
        // Отправка POST запроса на endpoint /login/
        api.post('login/', {
            email: data.email,
            password: data.password,
        })
            .then((response) => {
                console.log(response);

                // Сохранение JWT токенов в localStorage для последующего использования
                if (response.data.access) {
                    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
                }
                if (response.data.refresh) {
                    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);
                }

                // Перенаправление на главную страницу после успешного входа
                navigate(ROUTES.HOME);
            })
            .catch((error) => {
                // Обработка ошибок при входе (неверные учетные данные и т.д.)
                console.error('Login error:', error);
            });
    };

    return (
        <div className="myBackground login-page">
            <form onSubmit={handleSubmit(submission)}>
                <Box className={"whiteBox"}>

                    <Box className={"itemBox"}>
                        <Box className={"title"}>Login for Auth App</Box>
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
                        <MyButton
                            type={"submit"}
                            label={"Login"}
                        />
                    </Box>

                    <Box className={"itemBox"}>
                        <Link to={ROUTES.REGISTER}> No account yet? Please register!</Link>
                    </Box>

                </Box>
            </form>
        </div>
    );
};

export default Login;

