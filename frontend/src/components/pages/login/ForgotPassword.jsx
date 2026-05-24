/**
 * Запрос письма для восстановления пароля.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import MyTextField from "../../forms/MyTextField";
import MyButton from "../../forms/MyButton";
import api from "../../../services/api";
import { API_TIMEOUT_EMAIL } from "../../../config/api";
import { ROUTES, EMAIL_ERROR } from "../../../config/constants";
import { getApiErrorMessage } from "../../../utils/apiError";

const ForgotPassword = () => {
  const { handleSubmit, control, setError } = useForm();
  const [submitted, setSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const submission = (data) => {
    setLoading(true);
    setServerMessage(null);
    api
      .post(
        "password-reset/request/",
        { email: data.email.trim() },
        { timeout: API_TIMEOUT_EMAIL }
      )
      .then((response) => {
        setSubmitted(true);
        setServerMessage(
          response.data?.message ||
            "Если указанный email зарегистрирован, на него отправлена инструкция по восстановлению пароля."
        );
      })
      .catch((error) => {
        const resp = error?.response?.data;
        if (resp?.email) {
          const msg = Array.isArray(resp.email) ? resp.email.join(", ") : resp.email;
          setError("email", { type: "server", message: msg });
        } else {
          setServerMessage(
            getApiErrorMessage(
              error,
              "Не удалось отправить запрос. Попробуйте позже."
            )
          );
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="auth-background login-page">
      <main className="auth-main" role="main">
        <Box className="auth-box">
          <Box className="auth-item">
            <h1 className="auth-title">Восстановление пароля</h1>
          </Box>

          {submitted ? (
            <>
              <Box className="auth-item auth-message auth-message--success">
                <p>{serverMessage}</p>
              </Box>
              <Box className="auth-item">
                <Link to={ROUTES.LOGIN} className="auth-link">
                  Вернуться ко входу
                </Link>
              </Box>
            </>
          ) : (
            <form onSubmit={handleSubmit(submission)}>
              <Box className="auth-item">
                <p className="auth-hint">
                  Укажите email, с которым вы регистрировались. Мы отправим ссылку для
                  установки нового пароля.
                </p>
              </Box>
              {serverMessage && (
                <Box className="auth-item auth-message auth-message--error">
                  <p>{serverMessage}</p>
                </Box>
              )}
              <Box className="auth-item">
                <MyTextField
                  label="Email"
                  name="email"
                  control={control}
                  rules={{
                    required: "Email обязателен для заполнения",
                    validate: (value) =>
                      (value || "").includes("@") || EMAIL_ERROR,
                  }}
                />
              </Box>
              <Box className="auth-item">
                <MyButton
                  type="submit"
                  label={loading ? "Отправка…" : "Отправить ссылку"}
                  disabled={loading}
                />
              </Box>
              <Box className="auth-item">
                <Link to={ROUTES.LOGIN} className="auth-link">
                  Вернуться ко входу
                </Link>
              </Box>
            </form>
          )}
        </Box>
      </main>
    </div>
  );
};

export default ForgotPassword;
