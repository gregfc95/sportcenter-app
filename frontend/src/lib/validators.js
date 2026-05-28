export const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const isValidEmail = (value) => EMAIL_RE.test(value);
