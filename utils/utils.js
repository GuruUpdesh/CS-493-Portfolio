const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { DOMAIN } = require("../utils/constants.js");

function getUrl(req) {
	const protocol = process.env.PORT ? "https" : "http";
	return protocol + "://" + req.get("host");
}

const checkJwt = jwt({
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${DOMAIN}/.well-known/jwks.json`,
	}),
	issuer: `https://${DOMAIN}/`,
	algorithms: ["RS256"],
});

module.exports = { getUrl, checkJwt };
