const express = require("express");
const {
	post_load,
	get_load,
	get_loads,
	patch_load,
	delete_load,
} = require("../models/loadModel.js");
const { getUrl, checkJwt, validateMIME } = require("../utils/utils.js");
const { errorMessages, AppError } = require("../utils/errorHandler.js");
const { LOAD } = require("../utils/constants.js");

const router = express.Router();

const errors = errorMessages[LOAD];

function error(msg) {
	return {
		Error: msg,
	};
}

function validateLoad(req, res, next) {
	const body = req.body;
	if (!body.volume || !body.item || !body.creation_date) {
		throw new AppError(400, errors.missingAttributes);
	}
	next();
}

router.post(
	"/",
	checkJwt,
	validateMIME(["application/json"]),
	validateLoad,
	async (req, res, next) => {
		try {
			const load = await post_load(
				req.body.volume,
				req.body.item,
				req.body.creation_date,
				getUrl(req)
			);
			res.status(201).json(load);
		} catch (err) {
			next(err);
		}
	}
);

router.get(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const load = await get_load(req.params.id, getUrl(req));
			res.status(200).json(load);
		} catch (err) {
			next(err);
		}
	}
);

router.get(
	"/",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const loads = await get_loads(getUrl(req), req.query.cursor);
			res.status(200).json(loads);
		} catch (err) {
			next(err);
		}
	}
);

router.patch(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const load = {};

			// add optional attributes
			if (req.body.volume) load.volume = req.body.volume;
			if (req.body.item) load.item = req.body.item;

			const updatedLoad = await patch_load(
				req.params.id,
				load,
				getUrl(req)
			);

			if (!updatedLoad) {
				return res.status(404).json(error(errors.invalidLoadId));
			}

			res.status(200).json(updatedLoad);
		} catch (err) {
			next(err);
		}
	}
);

router.delete(
	"/:id",
	checkJwt,
	validateMIME(["application/json"]),
	async (req, res, next) => {
		try {
			const load = await delete_load(req.params.id);
			if (!load) {
				return res.status(404).json(error(errors.invalidLoadId));
			}
			res.status(204).end();
		} catch (err) {
			next(err);
		}
	}
);

module.exports = router;
