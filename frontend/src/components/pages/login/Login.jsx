/**
 * Страница входа (Login)
 */
import './Login.css';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Box } from '@mui/material';
import MyTextField from '../../forms/MyTextField';
import MyPassField from '../../forms/MyPassField';
import MyButton from '../../forms/MyButton';
import api from '../../../services/api';
import { STORAGE_KEYS, ROUTES, EMAIL_ERROR } from '../../../config/constants';

const Login = () => {
  const navigate = useNavigate();
  const { handleSubmit, control } = useForm();

  const submission = (data) => {
    api.post('login/', {
      email: data.email,
      password: data.password,
    })
      .then((response) => {
        if (response.data.access) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
        }
        if (response.data.refresh) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);
        }
        navigate(ROUTES.HOME);
      })
      .catch((error) => {
        console.error('Login error:', error);
      });
  };

  return (
    <div className="auth-background login-page">
      <main className="auth-main" role="main">
        <form onSubmit={handleSubmit(submission)}>
          <Box className="auth-box">
            <Box className="auth-item">
              <h1 className="auth-title">Вход в кабинет</h1>
            </Box>
            <Box className="auth-item">
              <MyTextField
                label="Email"
                name="email"
                control={control}
                rules={{
                  required: "Email обязателен для заполнения",
                  validate: (value) =>
                    (value || "").includes("@") || EMAIL_ERROR
                }}
              />
            </Box>
            <Box className="auth-item auth-password-field">
              <MyPassField label="Пароль" name="password" control={control} />
            </Box>
            <Box className="auth-item">
              <MyButton type="submit" label="Войти" />
            </Box>
            <Box className="auth-item">
              <Link to={ROUTES.REGISTER} className="auth-link">
                Нет аккаунта? Зарегистрироваться
              </Link>
            </Box>
          </Box>
        </form>
      </main>
    </div>
  );
};

export default Login;
