const { Router } = require('express');
const { runAudit, getAudits } = require('../controllers/auditController');

const router = Router();

router.post('/audit', runAudit);
router.get('/audits', getAudits);

module.exports = router;
