function error(res, err) {
    console.error(err)
    res.status(500).json({ Error: "Internal server error" });
}

function getUrl(req) {
    const protocol = process.env.PORT ? "https" : "http";
    return protocol + "://" + req.get("host");
}

module.exports = {error, getUrl};