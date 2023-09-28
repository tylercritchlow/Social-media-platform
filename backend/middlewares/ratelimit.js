const setRateLimit = require("express-rate-limit");

const rateLimitMiddleware = setRateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {"status": 429, "message": `Ratelimit exceeded 60s per 100 requests.`},
  headers: true,
});

module.exports = rateLimitMiddleware;