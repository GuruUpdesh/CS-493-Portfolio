const { UnauthorizedError } = require("express-jwt");
const { BOAT, LOAD } = require("./constants");

class AppError extends Error {
    code = 200;

    constructor(code, message) {
        super()
        this.code = code;
        this.message = message;
    }
}


const errorHandler = (err, req, res, next) => {

    if (err instanceof UnauthorizedError) {
        res.status(err.status).send({Error: err.message});
        return;
    }

    if (err instanceof AppError) {
        res.status(err.code).send({Error: err.message});
        return;
    }

    console.log('errorHandler > Error: ', err);
    res.status(500).json({
        Error: err.message,
    })
}

const errorMessages = {
    [BOAT]: {
        server: "Internal server error",
        missingAttributes:
            "The request object is missing at least one of the required attributes",
        invalidBoatId: "No boat with this boat_id exists",
        notOwner: "You do not own this boat",
        notFound: "The specified boat and/or load does not exist",
        alreadyLoaded: "The load is already loaded on another boat",
        mismatchedEntity:
            "No boat with this boat_id is loaded with the load with this load_id",
    },
    [LOAD]: {
        server: "Internal server error",
        missingAttributes:
            "The request object is missing at least one of the required attributes",
        invalidLoadId: "No load with this load_id exists",
    }
};

module.exports = {errorHandler, AppError, errorMessages};