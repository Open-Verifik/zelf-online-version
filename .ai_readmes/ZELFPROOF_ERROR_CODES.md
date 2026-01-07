# ZelfProof Error Status Codes

## Overview

The `_formattingError` function in `zelf-proof.module.js` now returns appropriate HTTP status codes based on the type of error encountered during encryption/decryption operations.

## HTTP Status Code Mapping

### 422 Unprocessable Entity - Face Validation Errors

**Used for:** Client-side validation errors where the image/face doesn't meet requirements

**Triggers:**

-   `FACE IS NOT CENTRAL` - Face is not centered in the image
-   `NOT CENTRAL` - General centering issues
-   `MULTIPLE FACE` - More than one face detected
-   `NO FACE DETECTED` - No face found in the image
-   `FACE NOT RECOGNIZED` - Face doesn't match expected criteria
-   `LIVENESS` - Liveness detection failed
-   `FACE QUALITY` - Face quality is too poor
-   `FACE TOO SMALL` - Face is too small in the image
-   `FACE TOO LARGE` - Face is too large/close
-   Any error code containing `FACE_`

**Why 422?** These are validation errors where the request is well-formed, but the content (face image) doesn't meet the business logic requirements. The client can retry with a better image.

### 401 Unauthorized - Authentication Errors

**Used for:** Authentication and password verification failures

**Triggers:**

-   `INVALID PASSWORD` - Password doesn't match
-   `AUTHENTICATION FAILED` - General auth failure
-   `UNAUTHORIZED` - User not authorized
-   Any error code containing `AUTH_`

**Why 401?** These indicate authentication failures where credentials are invalid.

### 400 Bad Request - Invalid Data Format

**Used for:** Malformed requests or invalid data format

**Triggers:**

-   `INVALID IMAGE` - Image format is invalid
-   `INVALID FORMAT` - Data format is incorrect
-   `INVALID DATA` - Data is malformed
-   Error code `ERR_INVALID_IMAGE`

**Why 400?** The request itself is malformed or contains invalid data that cannot be processed.

### 500 Internal Server Error - Unknown Errors

**Used for:** Unexpected errors or system failures

**Triggers:**

-   Any error that doesn't match the above categories
-   Unexpected system failures
-   Unknown error conditions

**Why 500?** These are server-side errors that the client cannot fix by retrying.

## Frontend Handling

### Example: Handling Different Error Codes

```typescript
try {
	const result = await zelfProofService.decrypt(data);
} catch (error) {
	switch (error.status) {
		case 422:
			// Face validation error - show user-friendly message
			showError("Please ensure your face is centered and clearly visible");
			// Allow retry with better image
			break;

		case 401:
			// Authentication error
			showError("Invalid password or authentication failed");
			break;

		case 400:
			// Bad request
			showError("Invalid image format. Please use a valid image file");
			break;

		case 500:
			// Server error
			showError("An unexpected error occurred. Please try again later");
			break;
	}
}
```

## Benefits

1. **Better Error Categorization**: Frontend can handle different error types appropriately
2. **Improved UX**: Users get specific, actionable feedback
3. **Easier Debugging**: Developers can quickly identify error categories
4. **RESTful Compliance**: Follows HTTP status code best practices
5. **Retry Logic**: Frontend can implement smart retry strategies based on error type

## Migration Notes

-   **Before**: All errors returned 500 status code
-   **After**: Errors return appropriate status codes (422, 401, 400, or 500)
-   **Backward Compatibility**: Existing error handling will still work, but can now be enhanced to handle specific status codes
