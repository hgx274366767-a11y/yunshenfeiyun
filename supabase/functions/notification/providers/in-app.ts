/**
 * 站内消息 — 写入 messages 表，通过 Supabase Realtime 推送
 * 这是MVP阶段最主要的通知渠道（零成本、实时送达）
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NotificationProvider, SendParams } from "./interface.ts";

export class InAppProvider implements NotificationProvider {
  readonly channel = "in_app" as const;
  readonly name = "站内消息";

  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  async send(params: SendParams): Promise<{ success: boolean; provider_msg_id?: string }> {
    const { data, error } = await this.supabase
      .from("messages")
      .insert({
        user_id: params.user_id,
        title: params.title,
        content: params.content,
        type: params.type,
        related_order_id: params.related_order_id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, provider_msg_id: undefined };
    }

    return { success: true, provider_msg_id: data.id };
  }
}
