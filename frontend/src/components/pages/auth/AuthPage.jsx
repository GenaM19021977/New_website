/**
 * Страница авторизации и регистрации (те же вкладки, что в AuthModal).
 * ?tab=register — открыть вкладку «Регистрация».
 */
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import AuthModal from "../../modals/AuthModal";
import { ROUTES } from "../../../config/constants";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? 1 : 0;
  const returnTo = location.state?.from;

  const handleClose = () => {
    const backState =
      returnTo === ROUTES.CONTACTS
        ? { contactsTab: location.state?.contactsTab ?? 1 }
        : undefined;
    if (returnTo) {
      navigate(returnTo, { replace: true, state: backState });
    } else {
      navigate(ROUTES.HOME, { replace: true });
    }
  };

  return (
    <AuthModal
      open
      initialTab={initialTab}
      returnTo={returnTo}
      onClose={handleClose}
    />
  );
};

export default AuthPage;
