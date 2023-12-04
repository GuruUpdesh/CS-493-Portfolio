const express = require("express");
const {
    post_load,
    get_load,
    get_loads,
    get_boat_loads,
    manage_load,
    delete_load,
} = require("../models/loadModel.js");
const {error, getUrl} = require("../utils/utils.js");

const router = express.Router();

const INVALID_LOAD_ID_MESSAGE = {
    Error: "No load with this load_id exists",
};

function validateLoad(req, res, next) {
    const body = req.body;
    if (!body.volume || !body.item || !body.creation_date) {
        return res.status(400).json({
            Error: "The request object is missing at least one of the required attributes",
        });
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
        error(res, err);
    }
});

router.get("/:id", async (req, res) => {
    try {
        const load = await get_load(req.params.id, getUrl(req));

        if (!load) {
            return res.status(404).json(INVALID_LOAD_ID_MESSAGE);
        }
        res.status(200).json(load);
    } catch (err) {
        error(res, err);
    }
});

router.get("/", async (req, res) => {
    try {
        const loads = await get_loads(getUrl(req), req.query.cursor);
        res.status(200).json(loads);
    } catch (err) {
        error(res, err);
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const load = await delete_load(req.params.id);
        if (!load) {
            return res.status(404).json(INVALID_LOAD_ID_MESSAGE);
        }
        res.status(204).end();
    } catch (err) {
        error(res, err);
    }
});


module.exports = router;
