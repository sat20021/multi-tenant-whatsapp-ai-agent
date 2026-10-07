'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const logger = require('../src/config/logger');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');

const SEED_DATA = [
  {
    accountId: 'acc_A',
    businessName: 'Sunrise Realty',
    phoneNumberId: 'PHONE_TENANT_A',
    tone: 'professional and polite',
    language: 'Reply in the same language the customer uses (English, Hindi or Hinglish)',
    pricing: '2BHK flats start at Rs 45 lakh. 3BHK flats start at Rs 68 lakh. Booking amount is Rs 1 lakh.',
    faqs: [
      { q: 'Where is the project?', a: 'Sector 62, Noida, near the metro station.' },
      { q: 'Is a site visit possible?', a: 'Yes, site visits run daily from 10 AM to 6 PM.' },
      { q: 'Is a home loan available?', a: 'Yes, we have tie-ups with SBI, HDFC and ICICI.' },
    ],
    owner: { name: 'Sunrise Owner', email: 'owner@sunrise.test', password: 'Sunrise@123' },
  },
  {
    accountId: 'acc_B',
    businessName: 'FitZone Gym',
    phoneNumberId: 'PHONE_TENANT_B',
    tone: 'friendly and energetic',
    language: 'Reply in the same language the customer uses (English, Hindi or Hinglish)',
    pricing: 'Monthly plan Rs 1,500. Quarterly plan Rs 4,000. Yearly plan Rs 12,000. Personal trainer Rs 3,000 per month extra.',
    faqs: [
      { q: 'What are the timings?', a: '5 AM to 11 PM, all 7 days.' },
      { q: 'Is there a free trial?', a: 'Yes, one free trial day for new members.' },
      { q: 'Do you have a steam room?', a: 'Yes, steam and shower are included in all plans.' },
    ],
    owner: { name: 'FitZone Owner', email: 'owner@fitzone.test', password: 'FitZone@123' },
  },
];

async function seed() {
  await mongoose.connect(config.mongodb.uri);
  logger.info('[Seed] Connected to MongoDB');

  for (const data of SEED_DATA) {
    const { owner, ...tenantData } = data;

    // Upsert tenant (idempotent)
    const tenant = await Tenant.findOneAndUpdate(
      { accountId: tenantData.accountId },
      tenantData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info(`[Seed] Tenant upserted: ${tenant.businessName}`);

    // Upsert user with hashed password
    const passwordHash = await bcrypt.hash(owner.password, 12);
    const user = await User.findOneAndUpdate(
      { email: owner.email.toLowerCase() },
      {
        accountId: tenant.accountId,
        email: owner.email.toLowerCase(),
        passwordHash,
        name: owner.name,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.info(`[Seed] User upserted: ${user.email} (accountId: ${user.accountId})`);
  }

  logger.info('[Seed] Complete');
  logger.info('[Seed] Credentials:');
  logger.info('[Seed]   Tenant A: owner@sunrise.test / Sunrise@123');
  logger.info('[Seed]   Tenant B: owner@fitzone.test / FitZone@123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error('[Seed] Failed', { error: err.message });
  process.exit(1);
});
