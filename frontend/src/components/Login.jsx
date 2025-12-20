/**
 * Компонент страницы входа (Login)
 * 
 * Отображает форму входа с полями email и password.
 * При успешной аутентификации сохраняет JWT токены в localStorage
 * и перенаправляет пользователя на главную страницу.
 */

import '../App.css'
import { Box } from "@mui/material"
import MyTextField from './forms/MyTextField'
import MyPassField from './forms/MyPassField'
import MyButton from './forms/MyButton'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AxiosInstance from './AxiosInstance'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    // Хук для программной навигации
    const navigate = useNavigate()
    
    // Хук для управления формой (react-hook-form)
    const { handleSubmit, control } = useForm()

    /**
     * Обработчик отправки формы входа
     * 
     * @param {Object} data - Данные формы (email, password)
     */
    const submission = (data) => {
        // Отправка POST запроса на endpoint /login/
        AxiosInstance.post('login/', {
            email: data.email,
            password: data.password,
        })
            .then((response) => {
                console.log(response)
                
                // Сохранение JWT токенов в localStorage для последующего использования
                if (response.data.access) {
                    localStorage.setItem('access_token', response.data.access)
                }
                if (response.data.refresh) {
                    localStorage.setItem('refresh_token', response.data.refresh)
                }
                
                // Перенаправление на главную страницу после успешного входа
                navigate('/home')
            })
            .catch((error) => {
                // Обработка ошибок при входе (неверные учетные данные и т.д.)
                console.error('Login error:', error)
            })
    }

    return (
        <div className="myBackground">
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
                        <Link to="/register"> No account yet? Please register!</Link>
                    </Box>

                </Box>
            </form>

        </div>
    )

}

export default Login
