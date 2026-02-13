/**
 * Личный кабинет пользователя
 *
 * Страница с информацией о пользователе и возможностью редактирования:
 * - Аватар, имя, email
 * - Личные данные (адрес)
 * - Смена пароля
 * - Выход из аккаунта
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import CopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import api from "../../../services/api";
import { useForm, Controller } from "react-hook-form";
import MyTextField from "../../forms/MyTextField";
import MyPassField from "../../forms/MyPassField";
import { STORAGE_KEYS, ROUTES, COUNTRIES, PHONE_REGEX, PHONE_ERROR } from "../../../config/constants";
import { getAvatarUrl } from "../../../utils/avatar";
import "./PersonalCabinet.css";

const PersonalCabinet = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personalDataOpen, setPersonalDataOpen] = useState(true);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { handleSubmit: handlePersonalSubmit, control: personalControl, reset: resetPersonal } = useForm({
    defaultValues: {
      phone: "",
      country: "",
      region: "",
      district: "",
      city: "",
      street: "",
      house_number: "",
      building_number: "",
      apartment_number: "",
    },
  });

  const { handleSubmit: handlePasswordSubmit, control: passwordControl, reset: resetPassword, watch: watchPassword } = useForm();
  const newPassword = watchPassword("new_password");

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    api
      .get("me/")
      .then((res) => {
        setUser(res.data);
        resetPersonal({
          phone: res.data.phone || "",
          country: res.data.country || "",
          region: res.data.region || "",
          district: res.data.district || "",
          city: res.data.city || "",
          street: res.data.street || "",
          house_number: res.data.house_number || "",
          building_number: res.data.building_number || "",
          apartment_number: res.data.apartment_number || "",
        });
        setAvatarPreview(res.data.avatar ? getAvatarUrl(res.data.avatar) : null);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          navigate(ROUTES.LOGIN, { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, resetPersonal]);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      alert("Файл не подходит. Используйте JPEG, PNG, GIF или WebP до 5MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await api.patch("me/update_profile/", formData);
      setUser(res.data);
      if (res.data.avatar) setAvatarPreview(getAvatarUrl(res.data.avatar));
    } catch (err) {
      setAvatarPreview(user?.avatar ? getAvatarUrl(user.avatar) : null);
      alert("Ошибка при обновлении аватара");
    }
    e.target.value = "";
  };

  const handleSavePersonalData = (data) => {
    api
      .patch("me/update_profile/", data)
      .then((res) => {
        setUser(res.data);
        setPersonalDataOpen(false);
      })
      .catch(() => alert("Ошибка при обновлении данных"));
  };

  const handleChangePassword = (data) => {
    api
      .post("me/change_password/", {
        old_password: data.old_password,
        new_password: data.new_password,
        new_password2: data.new_password2,
      })
      .then(() => {
        alert("Пароль успешно изменён");
        resetPassword();
        setPasswordOpen(false);
      })
      .catch((err) => {
        const msg = err?.response?.data
          ? Object.entries(err.response.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
              .join("\n")
          : "Ошибка при смене пароля";
        alert(msg);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    navigate(ROUTES.HOME);
    window.location.reload();
  };

  if (loading) {
    return (
      <main className="page-main cabinet-page">
        <div className="page-container">
          <p className="cabinet-loading">Загрузка…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="page-main cabinet-page">
      <div className="page-container">
        <section className="page-section cabinet-section" aria-labelledby="cabinet-heading">
          <h1 id="cabinet-heading" className="page-section-heading cabinet-heading">
            Личный кабинет
          </h1>

          <div className="cabinet-content">
            <div className="cabinet-header">
              <Box className="cabinet-avatar-container">
                <Avatar src={avatarPreview} alt={`${user.first_name} ${user.last_name}`} className="cabinet-avatar">
                  {!avatarPreview && ((user.first_name?.[0] || "") + (user.last_name?.[0] || "") || "U")}
                </Avatar>
                <input type="file" accept="image/*" id="cabinet-avatar-upload" style={{ display: "none" }} onChange={handleAvatarChange} />
                <label htmlFor="cabinet-avatar-upload">
                  <IconButton component="span" className="cabinet-avatar-upload-btn">
                    <PhotoCameraIcon />
                  </IconButton>
                </label>
              </Box>
              <div className="cabinet-name">
                {user.first_name} {user.last_name}
              </div>
              <TextField
                value={user.email || ""}
                variant="outlined"
                size="small"
                label="Email"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Скопировать">
                        <IconButton onClick={handleCopyEmail} color={emailCopied ? "success" : "default"} edge="end">
                          {emailCopied ? <CheckIcon /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                className="cabinet-email-field"
              />
              <TextField
                value={user.phone || ""}
                variant="outlined"
                size="small"
                label="Телефон"
                placeholder="Не указан"
                InputProps={{ readOnly: true }}
                className="cabinet-email-field"
              />
            </div>

            <div className="cabinet-section-block">
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => setPersonalDataOpen(!personalDataOpen)}
                className="cabinet-section-btn"
              >
                Личные данные
              </Button>
              <Collapse in={personalDataOpen}>
                <div className="cabinet-section-content">
                  <form onSubmit={handlePersonalSubmit(handleSavePersonalData)}>
                    <div className="cabinet-form-grid">
                      <MyTextField
                        label="Телефон"
                        name="phone"
                        control={personalControl}
                        rules={{
                          validate: (value) => {
                            const v = (value || "").trim();
                            if (!v) return true;
                            return PHONE_REGEX.test(v) || PHONE_ERROR;
                          }
                        }}
                      />
                      <Controller
                        name="country"
                        control={personalControl}
                        render={({ field }) => (
                          <TextField {...field} select label="Страна проживания" variant="outlined" fullWidth size="small">
                            {COUNTRIES.map((c) => (
                              <MenuItem key={c} value={c}>{c}</MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                      <MyTextField label="Область" name="region" control={personalControl} />
                      <MyTextField label="Район" name="district" control={personalControl} />
                      <MyTextField label="Город" name="city" control={personalControl} />
                      <MyTextField label="Улица" name="street" control={personalControl} />
                      <MyTextField label="Номер дома" name="house_number" control={personalControl} />
                      <MyTextField label="Номер корпуса" name="building_number" control={personalControl} />
                      <MyTextField label="Номер квартиры" name="apartment_number" control={personalControl} />
                    </div>
                    <Button type="submit" variant="contained" className="cabinet-save-btn">
                      Сохранить
                    </Button>
                  </form>
                </div>
              </Collapse>
            </div>

            <div className="cabinet-section-block">
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordOpen(!passwordOpen)}
                className="cabinet-section-btn"
              >
                Пароль и безопасность
              </Button>
              <Collapse in={passwordOpen}>
                <div className="cabinet-section-content">
                  <form onSubmit={handlePasswordSubmit(handleChangePassword)}>
                    <div className="cabinet-form-vertical">
                      <MyPassField label="Старый пароль" name="old_password" control={passwordControl} rules={{ required: "Обязательно" }} />
                      <MyPassField
                        label="Новый пароль"
                        name="new_password"
                        control={passwordControl}
                        rules={{ required: "Обязательно", minLength: { value: 8, message: "Минимум 8 символов" } }}
                      />
                      <MyPassField
                        label="Подтверждение пароля"
                        name="new_password2"
                        control={passwordControl}
                        rules={{ required: "Обязательно", validate: (v) => v === newPassword || "Пароли не совпадают" }}
                      />
                    </div>
                    <Button type="submit" variant="contained" className="cabinet-save-btn">
                      Изменить пароль
                    </Button>
                  </form>
                </div>
              </Collapse>
            </div>

            <Button
              variant="contained"
              color="error"
              startIcon={<ExitToAppIcon />}
              onClick={handleLogout}
              className="cabinet-logout-btn"
              fullWidth
            >
              Выйти
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PersonalCabinet;
