// express
const express = require("express");
const bodyParser = require("body-parser");

// apis
const boatRouter = require("./apis/boatAPI.js");
const loadRouter = require("./apis/loadAPI.js");

// models
const {add_user, get_users} = require("./models/userModel.js");

// auth
const path = require(`path`);
require("dotenv").config();
const { auth } = require("express-openid-connect");
const {errorHandler} = require("./utils/errorHandler.js");

// auth config
const config = {
	authRequired: false,
	auth0Logout: true,
	secret: process.env.SECRET,
	baseURL: process.env.PORT
		? "https://assignment-7-jwt-405019.uw.r.appspot.com"
		: "http://localhost:3000",
	clientID: "EbbGFz3QByoRblpMYSzFJbIqUrfEndn5",
	issuerBaseURL: "https://dev-qx1yfds0nk5wzi0n.us.auth0.com",
};

// init app
const app = express();
app.use(auth(config));
app.use(bodyParser.json());
app.set("view engine", "ejs");

// add API routes
app.use("/boats", boatRouter);
app.use("/loads", loadRouter);

// static files depending on login status
app.get("/", (req, res) => {
	if (req.oidc.isAuthenticated()) {
        // create a User in the datastore if one doesn't exist
        const user = req.oidc.user;
        if (!user) {
            return res.status(400).json({
                Error: "User not found",
            });
        }

        add_user(req.oidc.user.sub, req.oidc.user.name, req.oidc.user.email);
		return res.render("user_info", {
			idToken: JSON.stringify(req.oidc.idToken, null, 2),
			idTokenCopy: req.oidc.idToken,
		});
	}
	res.render("welcome");
});

app.get("/users", async (req, res) => {
	const users = await get_users();
	res.status(200).json(users);
})

app.use(errorHandler)

// Listen to the App Engine-specified port, or 3000 otherwise
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});
