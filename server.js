const express = require("express");
const bodyParser = require("body-parser");

const boatRouter = require("./apis/boatAPI.js");
const loadRouter = require("./apis/loadAPI.js");

const app = express();
app.use(bodyParser.json());

app.use("/boats", boatRouter);
app.use("/loads", loadRouter);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});
