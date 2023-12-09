const express = require("express");
const {
	post_boat,
	get_boat,
	get_boats,
	patch_boat,
	delete_boat,
} = require("../models/boatModel.js");
const { manage_load } = require("../models/loadModel.js");
const { getUrl, checkJwt, validateMIME } = require("../utils/utils.js");
const { AppError, errorMessages } = require("../utils/errorHandler.js");
const { BOAT } = require("../utils/constants.js");

const router = express.Router();
const errors = errorMessages[BOAT];

function error(msg) {
	return {
		Error: msg,
	};
}

// Middleware to validate boat attributes
function validateBoat(req, res, next) {
	const body = req.body;
	if (!body.name || !body.type || !body.length) {
		throw new AppError(400, errors.missingAttributes);
	}
	next();
}

// Add a valid boat
router.post(
	"/",
	validateMIME(["application/json"]),
	checkJwt,
	validateBoat,
	async (req, res, next) => {
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
			next(err);
		}
	}
);

// Get a boat
router.get(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const boat = await get_boat(
				req.params.id,
				req.auth.sub,
				getUrl(req)
			);
			res.status(200).json(boat);
		} catch (err) {
			next(err);
		}
	}
);

// Get all boats
router.get(
	"/",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const boats = await get_boats(
				req.auth.sub,
				getUrl(req),
				req.query.cursor
			);
			res.status(200).json(boats);
		} catch (err) {
			next(err);
		}
	}
);

// Update a boat
router.patch(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const boat = {};

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
			next(err);
		}
	}
);

// Delete a boat
router.delete(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			await delete_boat(req.params.id, req.auth.sub);
			res.status(204).end();
		} catch (err) {
			next(err);
		}
	}
);

// Add a load to a boat
router.put(
	"/:boat_id/loads/:load_id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			await manage_load(
				req.params.load_id,
				req.params.boat_id,
				req.auth.sub
			);
			res.status(204).end();
		} catch (err) {
			next(err);
		}
	}
);

// Remove a load from a boat
router.delete(
	"/:boat_id/loads/:load_id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			await manage_load(
				req.params.load_id,
				req.params.boat_id,
				req.auth.sub,
				true
			);
			res.status(204).end();
		} catch (err) {
			next(err);
		}
	}
);

module.exports = router;
