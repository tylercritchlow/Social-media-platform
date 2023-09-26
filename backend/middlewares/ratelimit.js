const setRateLimit = require("express-rate-limit");

const rateLimitMiddleware = setRateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: {"status": 429, "message": `Ratelimit exceeded 60s per 1 request.`},
  headers: true,
});

module.exports = rateLimitMiddleware;