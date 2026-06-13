/**
 * 通知渠道接口 — 策略模式
 *
 * 三种渠道：微信模板消息、短信、站内消息
 */
export interface NotificationProvider {
  readonly channel: "wx_template" | "sms" | "in_app";
  readonly name: string;

  send(params: SendParams): Promise<{ success: boolean; provider_msg_id?: string }>;
}

export interface SendParams {
  user_id: string;
  title: string;
  content: string;
  type: "order" | "system" | "emergency" | "marketing";
  related_order_id?: string;
  /** 微信模板消息专用 */
  template_id?: string;
  template_data?: Record<string, string>;
  /** 短信专用 */
  phone?: string;
}
