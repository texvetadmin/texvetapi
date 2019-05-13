/**
 * FollowUp model
 */

import mongoose from 'mongoose';
import { RecipientSchema } from './recipients';

const FollowUpSchema = new mongoose.Schema(
  {
    template: {
      type: String,
    },
    recipients: [RecipientSchema],
    notificationTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationType',
    },
    data: {
      type: String,
    },
    delivery_date: {
      type: Date,
    },
    date_delivered: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: 'version' },
);

// Increment the version number before we save to the datastore.
FollowUpSchema.pre('save', function preSave(next) {
  this.increment();
  next();
});

let model;

// try to get schema, and if it doesn't exist, establish it.
try {
  model = mongoose.model('FollowUp');
} catch (error) {
  model = mongoose.model('FollowUp', FollowUpSchema);
}

const FollowUpModel = model;

export default FollowUpModel;
