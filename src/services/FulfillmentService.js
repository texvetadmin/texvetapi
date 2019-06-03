/* eslint-disable no-unused-vars */
import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import logger from '../utils/logger';
import staticResources from '../models/staticResources';
import FollowUp from '../models/followUp';
import FollUpService from './FollowUpService';
import EmailMessageLogService from './EmailMessageLogService';
import ChatbotHistory from '../models/chatbotHistory';

const sqs = new AWS.SQS({ region: process.env.USERPOOL_REGION });
const QUEUE_URL = `https://sqs.${process.env.USERPOOL_REGION}.amazonaws.com/${process.env.ACCOUNT_ID}/${process.env.GENERATE_EMAIL_QUEUE_NAME}`;

class FulfillmentService {
  getResourcesBySlug = async req => {
    try {
      const {
        params: { slug },
      } = req;

      return staticResources.findOne({ slug });
    } catch (err) {
      logger.error(`[${this.constructor.name}.getResourcesBySlug] Error: ${err}`);
      throw err;
    }
  };

  getServicesBySlug = async req => {
    try {
      const {
        params: { slug },
        body: { type, value },
      } = req;

      // TODO: get items by slug,type and value

      return [];
    } catch (err) {
      logger.error(`[${this.constructor.name}.getServicesBySlug] Error: ${err}`);
      throw err;
    }
  };

  getReferralsBySlug = async req => {
    try {
      const {
        params: { slug },
        body: { location },
      } = req;

      const type = slug.split('/')[1] || '';
      const county = location.toUpperCase() || '';
      const url = `${process.env.DRUPAL_URL}/rest/v1/fulfillments/referrals/${type}/${county}`;
      const resp = await fetch(url);
      const response = await resp.json();
      return response.map(data => ({
        organization: data.title || null,
        title: data.field_partner_contact_title || null,
        phone: data.field_phone || null,
        email: data.field_email || null,
        additional_email: data.field_persons_direct_work_email || null,
      }));
    } catch (err) {
      logger.error(`[${this.constructor.name}.getReferralsBySlug] Error: ${err}`);
      throw err;
    }
  };

  closeTheLoop = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    try {
      const handleSingleFollowUp = async followUp => {
        const emailLogId = EmailMessageLogService.logEmailRequest('CLOSE-THE-LOOP', followUp.data);

        const params = {
          MessageBody: {
            type: followUp.notification_type,
            data: followUp.data,
            emailLogId,
          },
          QueueUrl: QUEUE_URL,
        };
        sqs.sendMessage(params, err => {
          if (err) {
            logger.error(`[${this.constructor.name}.closeTheLoop.sendMessage] Error: ${err}`);
            throw err;
          } else {
            followUp.set({ date_delivered: new Date() });
            followUp.save();
          }
        });

        await FollUpService.addFollupIfNecessary(followUp.notification_type, followUp.data);
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const followUps = await FollowUp.find({ delivery_date: today }).exec();
      if (followUps && followUps.length) {
        const tasks = followUps.map(f => handleSingleFollowUp(f));
        await Promise.all(tasks);
      }

      callback(null, 'Follow-up messages successfully sent');
    } catch (err) {
      logger.error(`[${this.constructor.name}.closeTheLoop] Error: ${err}`);
      callback(err);
    }
  };

  processDialogFlowWebhook = async req => {
    try {
      const history = new ChatbotHistory(...req.body);
      history.save();

      return {
        fulfillmentText: 'Thank you for your input. It has been logged.',
        fulfillmentMessages: [
          {
            card: {
              title: 'card title',
              subtitle: 'card text',
              imageUri: 'https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png',
              buttons: [
                {
                  text: 'button text',
                  postback: 'https://assistant.google.com/',
                },
              ],
            },
          },
        ],
        source: 'example.com',
        payload: {
          google: {
            expectUserResponse: true,
            richResponse: {
              items: [
                {
                  simpleResponse: {
                    textToSpeech: 'this is a simple response',
                  },
                },
              ],
            },
          },
          facebook: {
            text: 'Hello, Facebook!',
          },
          slack: {
            text: 'This is a text response for Slack.',
          },
        },
        outputContexts: [
          {
            name: 'projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/context name',
            lifespanCount: 5,
            parameters: {
              param: 'param value',
            },
          },
        ],
        followupEventInput: {
          name: 'event name',
          languageCode: 'en-US',
          parameters: {
            param: 'param value',
          },
        },
      };
    } catch (err) {
      logger.error(`[${this.constructor.name}.processDialogFlowWebhook] Error: ${err}`);
      throw err;
    }
  };
}

export default new FulfillmentService();
