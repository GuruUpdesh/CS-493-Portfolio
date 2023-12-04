const express = require("express");
const {
	post_load,
	get_load,
	get_loads,
	delete_load,
} = require("../models/loadModel.js");
const { getUrl } = require("../utils/utils.js");

const router = express.Router();

const errors = {
	server: "Internal server error",
	missingAttributes:
		"The request object is missing at least one of the required attributes",
	invalidLoadId: "No load with this load_id exists",
};

function error(msg) {
	return {
		Error: msg,
	};
}

function validateLoad(req, res, next) {
	const body = req.body;
	if (!body.volume || !body.item || !body.creation_date) {
		return res.status(400).json(error(errors.missingAttributes));
	}
	next();
}

router.post("/", validateLoad, async (req, res) => {
	try {
		const load = await post_load(
			req.body.volume,
			req.body.item,
			req.body.creation_date,
			getUrl(req)
		);
		res.status(201).json(load);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

router.get("/:id", async (req, res) => {
	try {
		const load = await get_load(req.params.id, getUrl(req));

		if (!load) {
			return res.status(404).json(error(errors.invalidLoadId));
		}
		res.status(200).json(load);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

router.get("/", async (req, res) => {
	try {
		const loads = await get_loads(getUrl(req), req.query.cursor);
		res.status(200).json(loads);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const load = await delete_load(req.params.id);
		if (!load) {
			return res.status(404).json(error(errors.invalidLoadId));
		}
		res.status(204).end();
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

module.exports = router;
