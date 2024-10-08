/**
 * Find Element in Array
 * @param {array} array 
 * @param {string} key 
 * @param {mixed} value
 * @author Miguel Trevino 
 */
const findElementInArray = (arrayType, array, key, value) => {

    let result = null;
    switch (arrayType) {
        case 'objects':
            result = array.find(object => object[key] === value);
            break;
        case 'strings':
            result = array.indexOf(value);
        default:
            break;
    }

    return result;
};

/**
 * Find element index in array
 * @param {array} array 
 * @param {string} key 
 * @param {mixed} value
 * @author Miguel Trevino 
 */
const findElementIndexInArray = (arrayType, array, key, value) => {
    let position = -1;
    switch (arrayType) {
        case 'objects':
        case 'object':
        case 'mongo_object':
            position = array.findIndex(object => {

                if (arrayType === 'mongo_object') {
                    return object[key].toString() === value.toString();
                }

                return object[key] === value;
            });

            break;
        case 'strings':
            position = array.indexOf(value);
            
            break;
        default:
            break;
    }

    return position;
};

const convertPropertyTo = (array, key, type) => {

    for (let index = 0; index < array.length; index++) {
        const element = array[index];

        if (type === 'mongo_object_to_string') {

            element[key] = element[key].toString();

        }

    }
    return array;
};

/**
 * Find element index in array
 * @param {array} array 
 * @param {string} key 
 * @param {mixed} value
 * @author Miguel Trevino 
 */
function findElementIndexesInArray(arrayType, array, key, value) {
    let position = [];
    switch (arrayType) {
        case 'objects':
        case 'object':

            for (let index = 0; index < array.length; index++) {
                const element = array[index];
                if (element[key] && element[key] === value) {
                    position.push(index);
                }
            }

            break;
        case 'strings':
            position = array.indexOf(value);
        default:
            break;
    }

    return position;
}

const generateRandomToken = (length) => {
    length = length || 8;

    let text = "";

    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;

};

const makeRandomString = (length) => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};


const toCOP = (amount) => {
    var cop = amount.toLocaleString('es-CO', {
        currency: 'COP',
        style: 'currency'
    });
    return '$' + cop.split('COP')[1].trim();
};

const getIdsFromArray = (array, property, type) => {

    let ids = [];

    for (let index = 0; index < array.length; index++) {

        const element = array[index];

        if (element[property]) {

            let id = element[property];

            if (type === 'object') {

                id = id.toString();

            }

            if (ids.indexOf(id) === -1) {

                ids.push(id);

            }

        }

    }

    return ids;
}

const sumQuantitiesFromArray = (array, property) => {
    let total = 0;

    for (let index = 0; index < array.length; index++) {
        const element = array[index];

        if (element[property]) {

            total += element[property];

        }

    }

    return total;
};


const findElementIndexInArrayByKeys = (array, keysWithValues, multipleElements) => {

    let position = -1;
    let positions = [];

    let arrayToCompare = JSON.parse(JSON.stringify(array));

    for (let index = arrayToCompare.length - 1; index >= 0; index--) {

        let element = arrayToCompare[index];

        var comparisonPassed = keysWithValues ? true : false;

        for (let key in keysWithValues) {

            if (typeof keysWithValues[key] !== 'function') {

                if (!element.hasOwnProperty(key) || element[key] !== keysWithValues[key]) {
                    comparisonPassed = false;
                }

            }
        }

        if (comparisonPassed) {
            position = index;

            positions.push(index);
        }

    }

    return multipleElements ? positions : position;
}


const sortArray = (asc, desc, array, property) => {

    let sortedArray = array.sort((first, second) => {

        if (asc) {
            return second[property] - first[property];
        } else if (desc) {
            return first[property] - second[property];
        }

    });
    return sortedArray;
}

/**
 * checks if all the properties listed in the array are present in the object to analyze
 * @param {object} object_to_analyze 
 * @param {array} properties 
 */
const areRequiredFieldsInObject = (object_to_analyze, properties) => {

    if (!properties || typeof properties !== 'array' || object_to_analyze) {
        return false;
    }

    let validation = true;

    for (let index = 0; index < properties.length; index++) {

        const property = properties[index];

        if (object_to_analyze.hasOwnProperty(property) === 'undefined') {

            validation = false;

            break;

        }

    }

    return validation;
}

/**
 * check for required fields
 * @param {Array} fields 
 * @param {Object} body
 * @author Miguel Trevino
 */
const checkForRequiredFields = (fields, params) => {
    const requiredKeys = Object.keys(fields);
    const missingKeys = []
    for (const requiredKey of requiredKeys) {
        if (!params[requiredKey]) {
            missingKeys.push(requiredKey);
        }
    }

    return missingKeys.length ? missingKeys : null;
};

const populateArrayWithMatchingKey = (array, documents, key, value) => {




}


module.exports = {
    findElementInArray,
    findElementIndexInArray,
    findElementIndexesInArray,
    generateRandomToken,
    convertPropertyTo,
    toCOP: toCOP,
    getIdsFromArray,
    sumQuantitiesFromArray,
    findElementIndexInArrayByKeys,
    makeRandomString,
    sortArray: sortArray,
    areRequiredFieldsInObject,
    populateArrayWithMatchingKey,
    checkForRequiredFields,
};