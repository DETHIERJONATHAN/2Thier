/**
 * Middleware d'usurpation d'identité simplifié pour le développement
 * Cette version ne fait rien et appelle simplement next()
 */
export const impersonationMiddleware = (req, res, next) => {
  // Ne fait rien, juste passer à la prochaine fonction
  next();
};

export default impersonationMiddleware;
