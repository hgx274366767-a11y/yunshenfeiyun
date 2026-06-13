/**
 * 短信通知 — 通过阿里云/腾讯云短信服务
 *
 * MVP阶段调用占位，实际短信服务商待定
 */
import { NotificationProvider, SendParams } from "./interface.ts";

const SMS_ENDPOINT = Deno.env.get("SMS_API_ENDPOINT") || "";
const SMS_KEY = Deno.env.get("SMS_API_KEY") || "";

export class SmsProvider implements NotificationProvider {
  readonly channel = "sms" as const;
  readonly name = "短信通知";

  async send(params: SendParams): Promise<{ success: boolean; provider_msg_id?: string }> {
    if (!SMS_ENDPOINT) {
      console.log(`[SMS Mock] TO:${params.phone} TITLE:${params.title}`);
      return { success: true, provider_msg_id: `mock_sms_${Date.now()}` };
    }

    const res = await fetch(SMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMS_KEY}`,
      },
      body: JSON.stringify({
        phone: params.phone,
        template_id: params.template_id || "DEFAULT_SMS_TEMPLATE",
        params: { title: params.title, content: params.content },
      }),
    });

    const data = await res.json();
    return { success: data.code === 0, provider_msg_id: data.msg_id };
  }
}
