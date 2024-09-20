import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().min(3).required(),
  confirmPassword: Joi.ref("password")
}).with("password", "confirmPassword");
