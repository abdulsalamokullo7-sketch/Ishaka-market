const Joi = require("joi");

function validate(schema, target = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.details.map((d) => d.message)
      });
    }
    req[target] = value;
    return next();
  };
}

module.exports = { validate, Joi };
