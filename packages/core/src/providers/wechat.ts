/**
 * <div style={{backgroundColor: "#24292f", display: "flex", justifyContent: "space-between", color: "#fff", padding: 16}}>
 * <span>Built-in <b>Wechat</b> integration.</span>
 * <a href="https://wechat.qq.com">
 *   <img style={{display: "block"}} src="https://authjs.dev/img/providers/wechat.svg" height="48" width="48"/>
 * </a>
 * </div>
 *
 * @module providers/wechat
 */

import type { OAuthConfig, OAuthUserConfig } from "./index.js"

/** @see [Get the authenticated user](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html#3) */
export interface WechatProfile extends Record<string, any> {
    openid: string
    nickname: string
    sex: number
    province: string
    city: string
    country: string
    headimgurl: string
    privilege: Array<string>
    unionid: string
}

/**
 * Add Wechat login to your page.
 *
 * ### Setup
 *
 * #### Callback URL
 * ```
 * https://example.com/api/auth/callback/wechat
 * ```
 *
 * #### Configuration
 * ```ts
 * import { Auth } from "@auth/core"
 * import Wechat from "@auth/core/providers/wechat"
 *
 * const request = new Request(origin)
 * const response = await Auth(request, {
 *   providers: [Wechat({ clientId: WECHAT_CLIENT_ID, clientSecret: WECHAT_CLIENT_SECRET })],
 * })
 * ```
 *
 * ### Resources
 *
 *  - [Wechat OAuth documentation](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html)
 *
 * ### Notes
 *
 * By default, Auth.js assumes that the Wechat provider is
 * based on the [OAuth 2](https://www.rfc-editor.org/rfc/rfc6749.html) specification.
 *
 * :::tip
 *
 * The Wechat provider comes with a [default configuration](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/providers/wechat.ts).
 * To override the defaults for your use case, check out [customizing a built-in OAuth provider](https://authjs.dev/guides/providers/custom-provider#override-default-options).
 *
 * :::
 *
 * :::info **Disclaimer**
 *
 * If you think you found a bug in the default configuration, you can [open an issue](https://authjs.dev/new/provider-issue).
 *
 * Auth.js strictly adheres to the specification and it cannot take responsibility for any deviation from
 * the spec by the provider. You can open an issue, but if the problem is non-compliance with the spec,
 * we might not pursue a resolution. You can ask for more help in [Discussions](https://authjs.dev/new/github-discussions).
 *
 * :::
 */
export default function Wechat<P extends WechatProfile>(
    options: OAuthUserConfig<P>
  ): OAuthConfig<P> {
    return {
      id: "wechat",
      name: "Wechat",
      type: "oauth",
      authorization: {
        url: "https://open.weixin.qq.com/connect/oauth2/authorize",
        params: {
          appid: options.clientId,
          scope: "snsapi_base",
        },
      },
      token: {
        url: "https://api.weixin.qq.com/sns/oauth2/access_token",
        params: {
          appid: options.clientId,
          secret: options.clientSecret,
          grant_type: "authorization_code",
        },
        async request({ provider, client, params, checks }) {
          const response = await client.oauthCallback(
            provider.callbackUrl,
            params,
            checks,
            { exchangeBody: params }
          )
          return { tokens: response }
        },
      },
      userinfo: {
        url: 'https://api.weixin.qq.com/sns/userinfo',
        params: {
          lang: "zh_CN",
        },
        async request({ tokens, client, provider }) {
          const response = await client.userinfo(tokens.access_token!, {
            params: {
              access_token: tokens.access_token,
              openid: tokens.openid,
              // @ts-expect-error
              ...provider.userinfo?.params,
            },
            method: "GET",
          })
          console.log(response)
          return response
        },
      },
      profile(profile) {
        return {
          id: profile.openid,
          name: profile.nickname,
          email: null,
          image: profile.headimgurl,
        }
      },
      options,
    }
  }