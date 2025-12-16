"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(roles) {
    return function (req, res, next) {
        var authReq = req;
        var user = authReq.user;
        console.log('[requireRole] 🔍 DEBUG - User object:', {
            userId: user === null || user === void 0 ? void 0 : user.userId,
            isSuperAdmin: user === null || user === void 0 ? void 0 : user.isSuperAdmin,
            role: user === null || user === void 0 ? void 0 : user.role,
            userExists: !!user
        });
        if (!user) {
            console.log('[requireRole] ❌ Pas d\'utilisateur authentifié');
            res.status(403).json({ error: 'Accès refusé' });
            return;
        }
        // 👑 SUPER ADMIN A ACCÈS À TOUT ! C'EST LE BOSS ! 👑
        if (user.isSuperAdmin === true || user.role === 'super_admin') {
            console.log('[requireRole] 👑 SuperAdmin détecté - Accès autorisé à tout !');
            next();
            return;
        }
        // Un super_admin en mode impersonation a tous les droits
        if (authReq.originalUser && authReq.originalUser.role === 'super_admin') {
            console.log('[requireRole] 👑 SuperAdmin en impersonation détecté - Accès autorisé !');
            next();
            return;
        }
        if (!roles.includes(user.role)) {
            console.log("[requireRole] \u274C Acc\u00E8s refus\u00E9 - R\u00F4le ".concat(user.role, " non autoris\u00E9 pour ").concat(roles.join(', ')));
            res.status(403).json({ error: 'Accès refusé' });
            return;
        }
        next();
    };
}
