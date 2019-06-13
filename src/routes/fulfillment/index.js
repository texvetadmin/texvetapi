import express from 'express';
import FulfillmentController from '../../controllers/FulfillmentController';

const router = express.Router();

router.get('/resources/:slug', FulfillmentController.getResourcesBySlug);
router.get('/services/:slug/:location', FulfillmentController.getServicesBySlug);
router.get('/referrals/:slug/:location', FulfillmentController.getReferralsBySlug);
router.post('/dialogflow-webhook/location-based', FulfillmentController.processDialogFlowWebhook);

export default router;
