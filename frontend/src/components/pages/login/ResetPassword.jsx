/**
 * Установка нового пароля по ссылке из письма (?uid=…&token=…).
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Box } from "@mui/material";
import MyPassField from "../../forms/MyPassField";
import MyButton from "../../forms/MyButton";
import api from "../../../services/api";
import { ROUTES } from "../../../config/constants";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = (searchParams.get("uid") || "").trim();
  const token = (searchParams.get("token") || "").trim();
  const linkValid = useMemo(() => Boolean(uid && token), [uid, token]);

  const { handleSubmit, control, setError } = useForm();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const submission = (data) => {
    if (!linkValid) return;
    setLoading(true);
    setServerError(null);
    api
      .post("password-reset/confirm/", {
        uid,
        token,
        new_password: data.new_password,
        new_password2: data.new_password2,
      })
      .then(() => {
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: {
            passwordResetSuccess:
              "Пароль успешно изменён. Войдите с новым паролем.",
          },
        });
      })
      .catch((error) => {
        const resp = error?.response?.data;
        if (resp?.detail) {
          setServerError(resp.detail);
        } else if (resp) {
          Object.keys(resp).forEach((field) => {
            const msg = Array.isArray(resp[field])
              ? resp[field].join(", ")
              : resp[field];
            if (field === "new_password" || field === "new_password2") {
              setError(field, { type: "server", message: msg });
            } else {
              setServerError(msg);
            }
          });
        } else {
          setServerError("Не удалось изменить пароль. Попробуйте запросить ссылку снова.");
        }
      })
      .finally(() => setLoading(false));
  };

  if (!linkValid) {
    return (
      <div className="auth-background login-page">
        <main className="auth-main" role="main">
          <Box className="auth-box">
            <Box className="auth-item">
              <h1 className="auth-title">Сброс пароля</h1>
            </Box>
            <Box className="auth-item auth-message auth-message--error">
              <p>Ссылка недействительна или неполная. Запросите восстановление пароля заново.</p>
            </Box>
            <Box className="auth-item">
              <Link to={ROUTES.FORGOT_PASSWORD} className="auth-link">
                Запросить новую ссылку
              </Link>
            </Box>
            <Box className="auth-item">
              <Link to={ROUTES.LOGIN} className="auth-link">
                Вернуться ко входу
              </Link>
            </Box>
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-background login-page">
      <main className="auth-main" role="main">
        <form onSubmit={handleSubmit(submission)}>
          <Box className="auth-box">
            <Box className="auth-item">
              <h1 className="auth-title">Новый пароль</h1>
            </Box>
            <Box className="auth-item">
              <p className="auth-hint">Введите новый пароль (не менее 8 символов).</p>
            </Box>
            {serverError && (
              <Box className="auth-item auth-message auth-message--error">
                <p>{serverError}</p>
              </Box>
            )}
            <Box className="auth-item auth-password-field">
              <MyPassField
                label="Новый пароль"
                name="new_password"
                control={control}
                rules={{
                  required: "Пароль обязателен",
                  minLength: { value: 8, message: "Минимум 8 символов" },
                }}
              />
            </Box>
            <Box className="auth-item auth-password-field">
              <MyPassField
                label="Подтвердите пароль"
                name="new_password2"
                control={control}
                rules={{
                  required: "Подтвердите пароль",
                  minLength: { value: 8, message: "Минимум 8 символов" },
                }}
              />
            </Box>
            <Box className="auth-item">
              <MyButton
                type="submit"
                label={loading ? "Сохранение…" : "Сохранить пароль"}
                disabled={loading}
              />
            </Box>
            <Box className="auth-item">
              <Link to={ROUTES.FORGOT_PASSWORD} className="auth-link">
                Запросить ссылку снова
              </Link>
            </Box>
          </Box>
        </form>
      </main>
    </div>
  );
};

export default ResetPassword;
