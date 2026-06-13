/**
 * 消息发送服务 — 多渠道分发
 *
 * 优先级：站内消息（始终发送） + 可选微信模板/短信
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NotificationProvider, SendParams } from "./providers/interface.ts";
import { WxTemplateProvider } from "./providers/wx-template.ts";
import { SmsProvider } from "./providers/sms.ts";
import { InAppProvider } from "./providers/in-app.ts";

export interface SendInput {
  user_id: string;
  title: string;
  content: string;
  type: "order" | "system" | "emergency" | "marketing";
  related_order_id?: string;
  channels?: ("wx_template" | "sms" | "in_app")[];
  template_id?: string;
  template_data?: Record<string, string>;
  phone?: string;
}

export async function sendMessage(
  supabase: ReturnType<typeof createClient>,
  input: SendInput
): Promise<{ results: Array<{ channel: string; success: boolean; msg_id?: string }> }> {
  const channels = input.channels || ["in_app"];

  const wxProvider = new WxTemplateProvider();
  const smsProvider = new SmsProvider();
  const inAppProvider = new InAppProvider(supabase);

  const providers: Record<string, NotificationProvider> = {
    wx_template: wxProvider,
    sms: smsProvider,
    in_app: inAppProvider,
  };

  const params: SendParams = {
    user_id: input.user_id,
    title: input.title,
    content: input.content,
    type: input.type,
    related_order_id: input.related_order_id,
    template_id: input.template_id,
    template_data: input.template_data,
    phone: input.phone,
  };

  const results: Array<{ channel: string; success: boolean; msg_id?: string }> = [];

  for (const channel of channels) {
    const provider = providers[channel];
    if (!provider) continue;

    try {
      const result = await provider.send(params);
      results.push({
        channel: provider.channel,
        success: result.success,
        msg_id: result.provider_msg_id,
      });
    } catch (err: any) {
      results.push({ channel, success: false, msg_id: err.message });
    }
  }

  return { results };
}
