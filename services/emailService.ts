import { DeveloperRecord, EmailTemplate } from '../types';

// Default Templates
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_welcome',
    name: 'Welcome Message',
    subject: 'Welcome to the Hedera Developer Community!',
    body: "Hi {{firstName}},\n\nWelcome to the Hedera ecosystem! We noticed you joined via {{partnerCode}} but haven't started the course yet.\n\nGet started today and unlock your certification!\n\nBest,\nThe Hedera Team",
    trigger: 'Manual'
  },
  {
    id: 'tpl_nudge',
    name: 'Nudge - In Progress',
    subject: 'You are so close, {{firstName}}!',
    body: "Hello {{firstName}},\n\nYou are currently at {{percentage}}% completion. Don't stop now!\n\nYour community at {{partnerCode}} is rooting for you.\n\nFinish strong,\nThe Hedera Team",
    trigger: 'Manual'
  },
  {
    id: 'tpl_congrats',
    name: 'Certification Congratulations',
    subject: 'You did it! Certified Hedera Developer',
    body: "Congratulations {{firstName}}!\n\nWe are thrilled to certify you as a Hedera Developer. You completed the course in record time.\n\nStay tuned for exclusive events in {{partnerCode}}.\n\nCheers,\nThe Hedera Team",
    trigger: 'Manual'
  }
];

// Simulate API Call to MailerLite / SendGrid / Mailchimp
export const sendEmailCampaign = async (
  recipients: DeveloperRecord[], 
  template: EmailTemplate,
  onProgress: (sent: number) => void
): Promise<boolean> => {
  
  console.log(`[Email Service] Starting campaign '${template.name}' for ${recipients.length} users.`);
  
  // Batch processing simulation
  const BATCH_SIZE = 50;
  let sent = 0;

  // Create a promise that resolves when all "batches" are sent
  return new Promise((resolve) => {
      const processBatch = () => {
          const remaining = recipients.length - sent;
          const currentBatch = Math.min(remaining, BATCH_SIZE);
          
          if (currentBatch <= 0) {
              resolve(true);
              return;
          }

          // Simulate API latency
          setTimeout(() => {
              sent += currentBatch;
              onProgress(sent);
              
              // Log first user of batch as sample
              const sampleUser = recipients[sent - currentBatch];
              const personalizedBody = template.body
                  .replace('{{firstName}}', sampleUser.firstName)
                  .replace('{{partnerCode}}', sampleUser.partnerCode)
                  .replace('{{percentage}}', sampleUser.percentageCompleted.toString());
              
              console.log(`[Mock API] Sent to ${sampleUser.email}:`, personalizedBody.substring(0, 50) + "...");

              processBatch();
          }, 400); // 400ms per batch
      };

      processBatch();
  });
};