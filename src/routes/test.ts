import express from 'express';
const router = express.Router();
router.get('/hello', (_req, res) => {
  res.send('Hello from test!');
});
export default router;
