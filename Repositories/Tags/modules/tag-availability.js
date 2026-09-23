/** Never authorize a registration from an absent, failed, or partial search. */
const assertTagAvailable = (result) => {
    const occupied = Boolean(result?.tagObject || result?.ipfs?.length || result?.arweave?.length);
    if (occupied) {
        const error = new Error("409:tag_already_exists");
        error.status = 409;
        throw error;
    }
    if (result?.available !== true || result.searchIncomplete || result.error) {
        const error = new Error("503:tag_search_incomplete");
        error.status = 503;
        throw error;
    }
};

module.exports = { assertTagAvailable };
