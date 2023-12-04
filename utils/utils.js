function getUrl(req) {
	const protocol = process.env.PORT ? "https" : "http";
	return protocol + "://" + req.get("host");
}

module.exports = { getUrl };
