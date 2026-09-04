// ==========================================
// FILE: src/services/whatsappService.ts
// ==========================================

interface SendWhatsAppMessageParams {
  to: string; // Recipient phone number (e.g., "2348123456789")
  message: string; // Plain text message body
}

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';

/**
 * Sends a plain text message to a buyer over WhatsApp via Meta Cloud API
 */
export async function sendWhatsAppTextMessage({
  to,
  message,
}: SendWhatsAppMessageParams): Promise<WhatsAppApiResponse> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error(
      '[WhatsApp Service Error] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment variables.'
    );
  }

  // Clean phone number (strip '+' or leading non-digits)
  const cleanPhone = to.replace(/\D/g, '');

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as WhatsAppApiResponse;

    if (!response.ok) {
      console.error('[WhatsApp Service Meta API Error]:', JSON.stringify(data, null, 2));
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    console.log(
      `[WhatsApp Service] Message successfully sent to +${cleanPhone}. Message ID: ${data.messages?.[0]?.id}`
    );
    return data;
  } catch (error: any) {
    console.error('[WhatsApp Service Error]:', error.message || error);
    throw error;
  }
}

/**
 * Helper to send interactive button messages (e.g., Accept / Decline / Counter quick options)
 */
export async function sendWhatsAppInteractiveButtons({
  to,
  bodyText,
  buttons,
}: {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
}): Promise<WhatsAppApiResponse> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('[WhatsApp Service Error] Missing required Meta configuration.');
  }

  const cleanPhone = to.replace(/\D/g, '');
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as WhatsAppApiResponse;

  if (!response.ok) {
    console.error('[WhatsApp Service Meta API Error]:', JSON.stringify(data, null, 2));
    throw new Error(`Meta API error: ${response.statusText}`);
  }

  return data;
}