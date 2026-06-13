/**
 * 微信模板消息 — 通过微信小程序订阅消息推送
 *
 * 需要用户在小程序内授权订阅，模板ID在微信公众平台申请
 */
import { NotificationProvider, SendParams } from "./interface.ts";

const WX_CLIENT_APPID = Deno.env.get("WX_CLIENT_APPID")!;
const WX_PILOT_APPID = Deno.env.get("WX_PILOT_APPID")!;

export class WxTemplateProvider implements NotificationProvider {
  readonly channel = "wx_template" as const;
  readonly name = "微信模板消息";

  async send(params: SendParams): Promise<{ success: boolean; provider_msg_id?: string }> {
    const accessToken = await getAccessToken();

    const body = {
      touser: params.user_id, // openid
      template_id: params.template_id || "DEFAULT_TEMPLATE_ID",
      page: params.related_order_id
        ? `/pages/order/detail?id=${params.related_order_id}`
        : "/pages/index/index",
      data: params.template_data || formatDefaultData(params),
    };

    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const result = await res.json();
    return { success: result.errcode === 0, provider_msg_id: result.msgid };
  }
}

function formatDefaultData(params: SendParams): Record<string, any> {
  return {
    thing1: { value: params.title.slice(0, 20) },
    thing2: { value: params.content.slice(0, 20) },
    time3: { value: new Date().toLocaleString("zh-CN") },
  };
}

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_CLIENT_APPID}&secret=${Deno.env.get("WX_APP_SECRET")}`
  );
  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}
