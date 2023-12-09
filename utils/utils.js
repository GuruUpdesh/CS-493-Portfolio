const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { DOMAIN } = require("../utils/constants.js");
const { AppError } = require("./errorHandler.js");

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

const acceptableRequestTypes = (types, attempted) =>
	`Invalid Content-Type provided. Acceptable types are: ${types.join(
		", "
	)}. You provided: ${attempted}.`;
function validateMIME(acceptableResponseTypes = []) {
	return (req, res, next) => {
		const acceptedTypes = (req.headers["accept"] || "")
			.split(",")
			.map((part) => part.split(";")[0].trim())
			.filter((type) => type);

		const isAnyTypeAcceptable = acceptedTypes.some((acceptedType) => {
			return (
				acceptedType === "*/*" ||
				acceptableResponseTypes.includes(acceptedType)
			);
		});

		// validate Accept header for response
		if (!isAnyTypeAcceptable && acceptableResponseTypes.length > 0) {
			throw new AppError(
				406,
				acceptableRequestTypes(acceptableResponseTypes, acceptedTypes)
			);
		}

		next();
	};
}

module.exports = { getUrl, checkJwt, validateMIME };
