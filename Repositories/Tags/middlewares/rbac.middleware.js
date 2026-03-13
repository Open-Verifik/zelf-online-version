const requireAdmin = async (ctx, next) => {
    const user = ctx.state.user;
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: "Unauthorized" };
        return;
    }
    // Owner (no accountType or accountType!=staff) is admin
    // Staff with role 'admin' is admin
    const isStaff = user.accountType === "staff";
    const role = user.role || "read"; // Default to read if not set

    if (!isStaff || role === "admin") {
        await next();
    } else {
        ctx.status = 403;
        ctx.body = { error: "Forbidden: Admin access required" };
    }
};

const requireWrite = async (ctx, next) => {
    const user = ctx.state.user;
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: "Unauthorized" };
        return;
    }
    const isStaff = user.accountType === "staff";
    const role = user.role || "read";

    // Owner is always write/admin
    // Staff with 'admin' or 'write'
    if (!isStaff || role === "admin" || role === "write") {
        await next();
    } else {
        ctx.status = 403;
        ctx.body = { error: "Forbidden: Write access required" };
    }
};

module.exports = {
    requireAdmin,
    requireWrite,
};
