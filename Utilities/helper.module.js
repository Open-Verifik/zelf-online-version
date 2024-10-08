/**
 * Is ambassador
 * @param {User} user
 * @return {boolean}
 */
const isAmbassador = (user) => {
    return !!user.providerId;
};

/**
 * Is partner location
 * @param {User} user
 * @return {boolean}
 */
const isPartnerLocation = (user) => {
    return user.partnerLocationId || user.role === 'partnerLocation';
};

/**
 * Is super admin
 * @param {User} user
 * @return {boolean}
 */
const isSuperAdmin = (user) => {
   return user.superAdminId || user.role === 'admin';
};

/**
 * Is user
 * @param {User} user
 * @return {boolean}
 */
const isUser = (user) => {
    return !!user.userId;
};

module.exports = {
    isAmbassador,
    isPartnerLocation,
    isSuperAdmin,
    isUser,
}
