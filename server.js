// express
const express = require("express");
const bodyParser = require("body-parser");

// apis
const boatRouter = require("./apis/boatAPI.js");
const loadRouter = require("./apis/loadAPI.js");

// auth
const path = require(`path`);
require('dotenv').config();
const { auth } = require("express-openid-connect");

// auth config
const config = {
	authRequired: false,
	auth0Logout: true,
	secret: process.env.SECRET,
	baseURL: process.env.PORT ? "https://assignment-7-jwt-405019.uw.r.appspot.com" : "http://localhost:3000",
	clientID: "EbbGFz3QByoRblpMYSzFJbIqUrfEndn5",
	issuerBaseURL: "https://dev-qx1yfds0nk5wzi0n.us.auth0.com",
};

// init app
const app = express();
app.use(auth(config));
app.use(bodyParser.json());

// add API routes
app.use("/boats", boatRouter);
app.use("/loads", loadRouter);

// static files depending on login status
app.get("/", (req, res) => {
	if (req.oidc.isAuthenticated()) {
		res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>User Info</title>
                <style>
                    body {
                        font-family: "Arial", sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f4f4f4;
                        width: 100vw;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                    }
        
                    main {
                        max-width: 600px;
                        text-align: center;
                    }
        
                    h1 {
                        color: #333;
                    }
        
                    .jwt-callout {
                        background-color: #eee;
                        border: 1px solid #ccc;
                        padding: 10px;
                        margin-top: 20px;
                        max-width: 600px;
                        word-wrap: break-word;
                        color: #333;
                    }
        
                    button {
                        background-color: #4285f4;
                        color: white;
                        padding: 10px 15px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 18px;
                        margin: 20px 0;
                        transition: background-color 0.3s;
                    }
        
                    button:hover {
                        background-color: #357ae8;
                    }
                </style>
            </head>
            <body>
                <main>
                    <a href="/logout">
                        <button type="submit">Logout</button>
                    </a>
                    <h2>Your JWT</h2>
                    <div class="jwt-callout">
                        <p>${JSON.stringify(req.oidc.idToken, null, 2)}</p>
                        <button onclick="copyJWT()">Copy JWT</button>
                    </div>
                </main>
                <script>
                    function copyJWT() {
                        const jwt = ${JSON.stringify(req.oidc.idToken)};
                        navigator.clipboard.writeText(jwt).then(() => {
                            alert('JWT copied to clipboard!');
                        });
                    }
                </script>
            </body>
        </html>
        `);
		return;
	}
	res.sendFile(path.join(__dirname, "/views/welcome_login.html"));
});

// Listen to the App Engine-specified port, or 3000 otherwise
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});
