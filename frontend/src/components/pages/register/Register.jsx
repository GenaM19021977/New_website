/**
 * Страница регистрации (Register)
 */
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Box } from '@mui/material';
import MyTextField from '../../forms/MyTextField';
import MyPassField from '../../forms/MyPassField';
import MyButton from '../../forms/MyButton';
import api from '../../../services/api';
import { STORAGE_KEYS, ROUTES, EMAIL_ERROR } from '../../../config/constants';

const Register = () => {
  const navigate = useNavigate();
  const { handleSubmit, control, setError } = useForm();

  const submission = (data) => {
    api.post('register/', {
      email: data.email,
      password: data.password,
    })
      .then(() => {
        return api.post('login/', {
          email: data.email,
          password: data.password,
        });
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
        console.error('Registration error:', error);
        const data = error?.response?.data;
        if (data) {
          Object.keys(data).forEach((field) => {
            const msg = Array.isArray(data[field]) ? data[field].join(", ") : data[field];
            setError(field, { type: "server", message: msg });
          });
        }
      });
  };

  return (
    <div className="auth-background register-page">
      <main className="auth-main" role="main">
        <form onSubmit={handleSubmit(submission)}>
          <Box className="auth-box">
            <Box className="auth-item">
              <h1 className="auth-title">Регистрация</h1>
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
            <Box className="auth-item">
              <MyPassField label="Пароль" name="password" control={control} />
            </Box>
            <Box className="auth-item">
              <MyPassField label="Подтвердите пароль" name="password2" control={control} />
            </Box>
            <Box className="auth-item">
              <MyButton type="submit" label="Зарегистрироваться" />
            </Box>
            <Box className="auth-item">
              <Link to={ROUTES.LOGIN} className="auth-link">
                Уже есть аккаунт? Войти
              </Link>
            </Box>
          </Box>
        </form>
      </main>
    </div>
  );
};

export default Register;
