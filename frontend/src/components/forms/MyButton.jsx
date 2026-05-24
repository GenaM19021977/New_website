import Button from '@mui/material/Button';

export default function MyButton(props) {
  const { label, type, disabled } = props;
  return (
    <Button
      type={type}
      variant="contained"
      className="myButton"
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
