export const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const isValidEmail = (value) => EMAIL_RE.test(value);

export const PASSWORD_RULE =
  "La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero";

export const isValidPassword = (value) =>
  value.length >= 8 &&
  value.length <= 15 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*(),.?":{}|<>]/.test(value);
