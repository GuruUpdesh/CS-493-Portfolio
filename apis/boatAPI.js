const express = require("express");
const {
	post_boat,
	get_boat,
	get_boats,
	patch_boat,
	delete_boat,
} = require("../models/boatModel.js");
const {
	get_boat_loads,
	manage_load,
} = require("../models/loadModel.js");
const {error, getUrl} = require("../utils/utils.js");

const router = express.Router();

const INVALID_BOAT_ID_MESSAGE = {
	Error: "No boat with this boat_id exists",
};

function validateBoat(req, res, next) {
	const body = req.body;
	if (!body.name || !body.type || !body.length) {
		return res.status(400).json({
			Error: "The request object is missing at least one of the required attributes",
		});
	}
	next();
}

router.post("/", validateBoat, async (req, res) => {
	try {
		const boat = await post_boat(
			req.body.name,
			req.body.type,
			req.body.length,
			getUrl(req)
		);
		res.status(201).json(boat);
	} catch (err) {
		error(res, err);
	}
});

router.get("/:id", async (req, res) => {
	try {
		const boat = await get_boat(req.params.id, getUrl(req));

		if (!boat) {
			return res.status(404).json(INVALID_BOAT_ID_MESSAGE);
		}
		res.status(200).json(boat);
	} catch (err) {
		error(res, err);
	}
});

router.get("/", async (req, res) => {
	try {
		const boats = await get_boats(getUrl(req), req.query.cursor);
		res.status(200).json(boats);
	} catch (err) {
		error(res, err);
	}
});

router.patch("/:id", validateBoat, async (req, res) => {
	try {
		const boat = {
			name: req.body.name,
			type: req.body.type,
			length: req.body.length,
		};
		await patch_boat(req.params.id, boat, getUrl(req));
		res.status(204).end();
	} catch (err) {
		error(res, err);
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const boat = await delete_boat(req.params.id);

		if (!boat) {
			return res.status(404).json(INVALID_BOAT_ID_MESSAGE);
		}
		res.status(204).end();
	} catch (err) {
		error(res, err);
	}
});

router.get("/:boat_id/loads", async (req, res) => {
	try {
		const boat = await get_boat(req.params.boat_id, getUrl(req));
		if (!boat) {
			return res.status(404).json(INVALID_BOAT_ID_MESSAGE);
		}
		const loads = await get_boat_loads(req.params.boat_id, getUrl(req));
		res.status(200).json(loads);
	} catch (err) {
		error(res, err);
	}
});

router.put("/:boat_id/loads/:load_id", async (req, res) => {
	try {
		await manage_load(req.params.load_id, req.params.boat_id);
		res.status(204).end();
	} catch (err) {
		if (err.message === "NOT_FOUND") {
			return res.status(404).json({Error: "The specified boat and/or load does not exist"});
		} else if (err.message === "FORBIDDEN") {
			return res.status(403).json({Error: "The load is already loaded on another boat"});
		} else {
			error(res, err);
		}
	}
});

router.delete("/:boat_id/loads/:load_id", async (req, res) => {
	try {
		await manage_load(req.params.load_id, req.params.boat_id, true);
		res.status(204).end();
	} catch (err) {
		if (err.message === "NOT_FOUND") {
			return res.status(404).json({Error: "No boat with this boat_id is loaded with the load with this load_id"});
		} else if (err.message === "FORBIDDEN") {
			return res.status(403).json({Error: "The load is already loaded on another boat"});
		} else {
			error(res, err);
		}
	}
});

module.exports = router;
