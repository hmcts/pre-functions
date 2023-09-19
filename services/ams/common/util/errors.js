function constructError(errorCode, errorMessage) {
    const error = new Error(errorMessage);
    error.code = errorCode;
    error.name = "ExpectedError";
    return error;
}

function handleFunctionError(context, req, functionName, err) {
    console.error(`Error running ${functionName}:`, err.message);
    console.error(`Error code: ${err.code}`);

    if (err.name == "ExpectedError") {
        return {
            status: err.code,
            body: err.message
        };
    }

    return {
        status: 500,
        body: "There was an error processing your request."
    };
}

function throwBadRequestError(errorMessage) {
    throw constructError(400, errorMessage || "Bad Request");
}

function throwNotFoundError(errorMessage) {
    throw constructError(404, errorMessage || "Not Found");
}

function throwInternalServerError(errorMessage) {
    throw constructError(500, errorMessage || "There was an error processing your request.");
}

function throwUnauthorizedError(errorMessage) {
    throw constructError(401, errorMessage || "Unauthorized");
}

module.exports = {
    handleFunctionError,
    throwBadRequestError,
    throwInternalServerError,
    throwNotFoundError,
    throwUnauthorizedError
}
