const WAHA_BASE_URL = 'http://z2193z6ocf7fmolaklbrj3os.173.212.255.184.sslip.io';
const WAHA_API_KEY = 'a3f8c2e1d4b7f9e0c6a1d3e8b2f4c7a9';
const WAHA_SESSION = 'default';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@c.us`;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${WAHA_BASE_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify({
        chatId: formatPhone(phone),
        text: message,
        session: WAHA_SESSION,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `WAHA error ${res.status}: ${body}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Unknown error' };
  }
}
