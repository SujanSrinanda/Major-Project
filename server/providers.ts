export interface NotificationProviderResult {
  sent: boolean;
  provider: string;
  message: string;
}

export async function sendOtpNotification(
  target: string,
  channel: 'email' | 'phone',
  otp: string
): Promise<NotificationProviderResult> {
  const smsProvider = process.env.SMS_PROVIDER || 'twilio';
  const smsAccountSid = process.env.SMS_ACCOUNT_SID;
  const smsAuthToken = process.env.SMS_AUTH_TOKEN;
  const smsFrom = process.env.SMS_FROM;

  const emailProvider = process.env.EMAIL_PROVIDER || 'twilio';
  const emailApiKey = process.env.EMAIL_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'no-reply@sentinelfin.com';

  const isDevMode = process.env.AUTH_DEV_MODE !== 'false' && process.env.NODE_ENV !== 'production';

  if (channel === 'phone') {
    if (smsAccountSid && smsAuthToken && smsFrom) {
      try {
        console.log(`[SMS PROVIDER] Dispatching SMS OTP to ${target} via Twilio (${smsFrom})...`);
        const body = new URLSearchParams({
          To: target,
          From: smsFrom,
          Body: `Your SentinelFin verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
        });

        const authHeader = 'Basic ' + Buffer.from(`${smsAccountSid}:${smsAuthToken}`).toString('base64');
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${smsAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        );

        if (!twilioRes.ok) {
          const errText = await twilioRes.text();
          console.warn(`[SMS PROVIDER] Twilio API responded with status ${twilioRes.status}: ${errText}`);
          if (isDevMode) {
            console.log(`[DEV SMS SIMULATION] (Fallback) Verification code for ${target} is: ${otp}`);
            return {
              sent: true,
              provider: 'twilio_fallback_sim',
              message: `Verification code sent to ${target}`,
            };
          }
          return {
            sent: false,
            provider: smsProvider,
            message: 'Failed to deliver SMS. Please check your phone number.',
          };
        }

        console.log(`[SMS PROVIDER] Successfully dispatched SMS via Twilio to ${target}`);
        return {
          sent: true,
          provider: smsProvider,
          message: `SMS verification code sent to ${target}`,
        };
      } catch (err: any) {
        console.error('SMS provider error:', err);
        if (isDevMode) {
          console.log(`[DEV SMS SIMULATION] (Fallback) Verification code for ${target} is: ${otp}`);
          return {
            sent: true,
            provider: 'development_sms_sim',
            message: `Verification code sent to ${target}`,
          };
        }
        return {
          sent: false,
          provider: smsProvider,
          message: 'Failed to send SMS via provider. Please try again.',
        };
      }
    } else {
      if (isDevMode) {
        console.log(`[DEV SMS SIMULATION] Simulated verification code for ${target} is: ${otp}`);
        return {
          sent: true,
          provider: 'development_sms_sim',
          message: `Verification code sent to ${target}`,
        };
      } else {
        return {
          sent: false,
          provider: 'none',
          message: 'SMS provider is not configured in production mode. Please contact support.',
        };
      }
    }
  } else {
    // Email channel
    if (emailApiKey) {
      try {
        console.log(`[EMAIL PROVIDER] Dispatching OTP to ${target} via ${emailProvider} (${emailFrom})...`);
        if (emailApiKey.startsWith('SG.')) {
          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${emailApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: target }] }],
              from: { email: emailFrom, name: 'SentinelFin Security' },
              subject: 'SentinelFin Security Verification Code',
              content: [
                {
                  type: 'text/plain',
                  value: `Your SentinelFin verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
                },
              ],
            }),
          });
          if (!res.ok) {
            console.warn(`[EMAIL PROVIDER] SendGrid responded with status ${res.status}`);
          }
        }

        if (isDevMode) {
          console.log(`[DEV EMAIL SIMULATION] Verification code for ${target} is: ${otp}`);
        }

        return {
          sent: true,
          provider: emailProvider,
          message: `Email verification code sent to ${target}`,
        };
      } catch (err: any) {
        console.error('Email provider error:', err);
        if (isDevMode) {
          console.log(`[DEV EMAIL SIMULATION] (Fallback) Verification code for ${target} is: ${otp}`);
          return {
            sent: true,
            provider: 'development_email_sim',
            message: `Verification code sent to ${target}`,
          };
        }
        return {
          sent: false,
          provider: emailProvider,
          message: 'Failed to send email via provider. Please try again.',
        };
      }
    } else {
      if (isDevMode) {
        console.log(`[DEV EMAIL SIMULATION] Simulated verification code for ${target} is: ${otp}`);
        return {
          sent: true,
          provider: 'development_email_sim',
          message: `Verification code sent to ${target}`,
        };
      } else {
        return {
          sent: false,
          provider: 'none',
          message: 'Email provider is not configured in production mode. Please contact support.',
        };
      }
    }
  }
}

