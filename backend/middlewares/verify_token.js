const jwt = require('jsonwebtoken')
require("dotenv").config();

function verifyToken(req, res, next) {
    const token = req.cookies._token;

    if (!token) {
        return res.status(403).send('Unauthorized');
    }

    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
        if (err) {
            return res.status(403).send('Unauthorized');
        }
        req.user = user;
        next();
    });
}

module.exports = verifyToken;