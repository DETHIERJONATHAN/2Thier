import blocksRouter from './routes/blocks';
import fieldsRouter from './routes/fields';
import sectionsRouter from './routes/sections';
import validationsRouter from './routes/validations'; // 1. Importer le nouveau routeur
import organizationsRouter from './routes/organizations';
import modulesRouter from './routes/modules';
// ...existing code...
app.use('/api/blocks', blocksRouter);
app.use('/api/fields', fieldsRouter);
app.use('/api/sections', sectionsRouter);
app.use('/api/validations', validationsRouter); // 2. Utiliser le nouveau routeur
app.use('/api/organizations', organizationsRouter);
app.use('/api/modules', modulesRouter);