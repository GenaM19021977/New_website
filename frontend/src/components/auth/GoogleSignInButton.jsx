/**
 * Кнопка входа / регистрации через Google (Google Identity Services).
 */
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import { saveAuthTokens } from "../../utils/authTokens";
import { getApiErrorMessage } from "../../utils/apiError";
import "./GoogleSignInButton.css";

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim();

export default function GoogleSignInButton({
  mode = "signin",
  onSuccess,
  onError,
  disabled = false,
}) {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="google-sign-in__hint">
        Вход через Google не настроен: укажите REACT_APP_GOOGLE_CLIENT_ID в frontend/.env
      </p>
    );
  }

  const handleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      const msg = "Google не вернул токен авторизации.";
      if (onError) {
        onError(msg);
      } else {
        setLocalError(msg);
      }
      return;
    }

    setLoading(true);
    setLocalError(null);
    onError?.(null);
    try {
      const response = await api.post("auth/google/", { id_token: idToken });
      saveAuthTokens(response.data);
      onSuccess?.(response.data);
    } catch (error) {
      const msg = getApiErrorMessage(
        error,
        "Не удалось войти через Google. Попробуйте позже."
      );
      if (onError) {
        onError(msg);
      } else {
        setLocalError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    const msg = "Не удалось открыть окно Google.";
    if (onError) {
      onError(msg);
    } else {
      setLocalError(msg);
    }
  };

  return (
    <div className={`google-sign-in${loading || disabled ? " google-sign-in--busy" : ""}`}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleGoogleError}
        useOneTap={false}
        locale="ru"
        text={mode === "signup" ? "signup_with" : "signin_with"}
        shape="rectangular"
        theme="outline"
        size="large"
        width="360"
      />
      {localError && <p className="google-sign-in__error">{localError}</p>}
    </div>
  );
}
