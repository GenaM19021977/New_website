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
    
    const navigate = useNavigate()
    const { handleSubmit, control } = useForm()

    const submission = (data) => {
        AxiosInstance.post('login/', {
            email: data.email,
            password: data.password,
        })
            .then((response) => {
                console.log(response)
                localStorage.setItem('Token', response.data.token)
                // Сохраняем токены в localStorage
                if (response.data.access) {
                    localStorage.setItem('access_token', response.data.access)
                }
                if (response.data.refresh) {
                    localStorage.setItem('refresh_token', response.data.refresh)
                }
                navigate('/home')
            })
            .catch((error) => {
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
