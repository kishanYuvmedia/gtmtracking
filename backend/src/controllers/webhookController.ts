import { Request, Response, NextFunction } from 'express';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'gtm_verify_token';

export const webhookController = {
  verifyMetaWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
  },

  async handleMetaWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { entry } = req.body;
      console.log('Meta webhook received:', JSON.stringify(entry));
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
