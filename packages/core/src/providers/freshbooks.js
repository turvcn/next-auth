/** @type {import(".").OAuthProvider} */
export default function Freshbooks(options) {
  return {
    id: "freshbooks",
    name: "Freshbooks",
    type: "oauth",
    authorization: "https://auth.freshbooks.com/service/auth/oauth/authorize",
    token: "https://api.freshbooks.com/auth/oauth/token",
    userinfo: "https://api.freshbooks.com/auth/api/v1/users/me",
    async profile(profile) {
      return {
        id: profile.response.id,
        name: `${profile.response.first_name} ${profile.response.last_name}`,
        email: profile.response.email,
        image: null,
      }
    },
    style: { logo: "/freshbooks-dark.svg", bg: "#0075dd", text: "#fff" },
    ...options,
  }
}
