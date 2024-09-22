import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().min(3).required(),
  confirm_password: Joi.ref("password")
}).with("password", "confirm_password");
