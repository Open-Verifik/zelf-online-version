// const restifyErrors = require("restify-errors");

// const MongoError = ["ValidationError", "MongoError"];
// /**
//  * error handler for http try catch methods in the controllers
//  * @param {Object} exception
//  * @author Miguel Trevino
//  */
// const errorHandler = (exception, optionalMessage) => {
// 	if (exception && exception.keyPattern && MongoError.includes(exception.name)) {
// 		let message = `ValidationError: ${Object.keys(exception.keyPattern).join(",")} is not a valid`;

// 		return new restifyErrors.InternalServerError(message);
// 	}

// 	let exceptionObject = null;
// 	switch (exception.message) {
// 		case "400":
// 			exceptionObject = new restifyErrors.BadRequestError(optionalMessage || "Bad Request");
// 			break;
// 		case "403":
// 			exceptionObject = new restifyErrors.ForbiddenError(optionalMessage || "Access forbidden");
// 			break;
// 		case "404":
// 			exceptionObject = new restifyErrors.NotFoundError(optionalMessage || "Record not found.");
// 			break;
// 		case "409":
// 			exceptionObject = new restifyErrors.ConflictError(optionalMessage || "Record conflicts with existing records in place.");
// 			break;
// 		case "412":
// 			exceptionObject = new restifyErrors.PreconditionFailedError(optionalMessage || "Pre condition to create this request, failed");
// 			break;
// 		case "422":
// 			exceptionObject = new restifyErrors.UnprocessableEntityError(optionalMessage || "Record cannot be saved with the current params");
// 			break;
// 		case "423":
// 			exceptionObject = new restifyErrors.LockedError(optionalMessage || "The resource that is being accessed is locked");
// 			break;
// 		case "451":
// 			exceptionObject = new restifyErrors.UnavailableForLegalReasonsError(
// 				optionalMessage || "The endpoint does not contain the data requested"
// 			);

// 			break;
// 		case "500":
// 			exceptionObject = new restifyErrors.InternalServerError(optionalMessage || "Server error.");
// 			break;
// 		case "504":
// 			exceptionObject = new restifyErrors.GatewayTimeoutError(optionalMessage || "Endpoint timedout, try again later.");
// 		default:
// 			if (exception.message) {
// 				const exceptionArray = exception.message.split(":");

// 				if (exceptionArray.length === 2) {
// 					return errorHandler(
// 						{
// 							message: exceptionArray[0],
// 						},
// 						exceptionArray[1]
// 					);
// 				}
// 			}

// 			exceptionObject = new restifyErrors.InternalServerError(exception.message);

// 			break;
// 	}
// 	return { code: exception.message, message: exceptionObject };
// };

module.exports = {
	errorHandler: () => {},
};
