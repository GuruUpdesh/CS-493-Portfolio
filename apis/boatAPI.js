const express = require("express");
const {
	post_boat,
	get_boat,
	get_boats,
	patch_boat,
	delete_boat,
} = require("../models/boatModel.js");
const { get_boat_loads, manage_load } = require("../models/loadModel.js");
const { getUrl, checkJwt } = require("../utils/utils.js");

const router = express.Router();

const errors = {
	server: "Internal server error",
	missingAttributes:
		"The request object is missing at least one of the required attributes",
	invalidBoatId: "You own no boat with this boat_id, or it does not exist",
	notFound: "The specified boat and/or load does not exist, or you do not own it",
	alreadyLoaded: "The load is already loaded on another boat",
	mismatchedEntity:
		"No boat with this boat_id is loaded with the load with this load_id",
};

function error(msg) {
	return {
		Error: msg,
	};
}

// Middleware to validate boat attributes
function validateBoat(req, res, next) {
	const body = req.body;
	if (!body.name || !body.type || !body.length) {
		return res.status(400).json(error(errors.missingAttributes));
	}
	next();
}

// Add a valid boat
router.post("/", checkJwt, validateBoat, async (req, res) => {
	try {
		const boat = await post_boat(
			req.body.name,
			req.body.type,
			req.body.length,
			req.auth.sub,
			getUrl(req)
		);
		res.status(201).json(boat);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Get a boat
router.get("/:id", checkJwt, async (req, res) => {
	try {
		const boat = await get_boat(req.params.id, req.auth.sub, getUrl(req));

		if (!boat) {
			return res.status(404).json(error(errors.invalidBoatId));
		}
		res.status(200).json(boat);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Get all boats
router.get("/", checkJwt, async (req, res) => {
	try {
		const boats = await get_boats(
			req.auth.sub,
			getUrl(req),
			req.query.cursor
		);
		res.status(200).json(boats);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Update a boat
router.patch("/:id", checkJwt, async (req, res) => {
	try {
		const boat = {}

		// add optional attributes
		if (req.body.name) boat.name = req.body.name;
		if (req.body.type) boat.type = req.body.type;
		if (req.body.length) boat.length = req.body.length;

		const updatedBoat = await patch_boat(
			req.params.id,
			boat,
			req.auth.sub,
			getUrl(req)
		);

		if (!updatedBoat) {
			return res.status(404).json(error(errors.invalidBoatId));
		}

		res.status(200).json(updatedBoat);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Delete a boat
router.delete("/:id", checkJwt, async (req, res) => {
	try {
		const boat = await delete_boat(req.params.id, req.auth.sub);

		if (!boat) {
			return res.status(404).json(error(errors.invalidBoatId));
		}
		res.status(204).end();
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Get all loads on a boat
router.get("/:boat_id/loads", checkJwt, async (req, res) => {
	try {
		const boat = await get_boat(req.params.boat_id, req.auth.sub, getUrl(req));
		if (!boat) {
			return res.status(404).json(error(errors.invalidBoatId));
		}
		const loads = await get_boat_loads(req.params.boat_id, getUrl(req));
		res.status(200).json(loads);
	} catch (err) {
		console.error(err);
		return res.status(500).json(error(errors.server));
	}
});

// Add a load to a boat
router.put("/:boat_id/loads/:load_id", checkJwt, async (req, res) => {
	try {
		await manage_load(req.params.load_id, req.params.boat_id, req.auth.sub);
		res.status(204).end();
	} catch (err) {
		if (err.message === "NOT_FOUND") {
			return res.status(404).json(error(errors.notFound));
		} else if (err.message === "FORBIDDEN") {
			return res.status(403).json(error(errors.alreadyLoaded));
		} else {
			console.error(err);
			return res.status(500).json(error(errors.server));
		}
	}
});

// Remove a load from a boat
router.delete("/:boat_id/loads/:load_id", checkJwt, async (req, res) => {
	try {
		await manage_load(req.params.load_id, req.params.boat_id, req.auth.sub, true);
		res.status(204).end();
	} catch (err) {
		if (err.message === "NOT_FOUND") {
			return res.status(404).json(error(errors.mismatchedEntity));
		} else if (err.message === "FORBIDDEN") {
			return res.status(403).json(error(errors.notFound));
		} else {
			console.error(err);
			return res.status(500).json(error(errors.server));
		}
	}
});

module.exports = router;
