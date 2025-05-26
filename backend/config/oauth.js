// LinuxDo OAuth2 配置
module.exports = {
  linuxdo: {
    // 这些需要在LinuxDo开发者平台申请
    clientID: process.env.LINUXDO_CLIENT_ID || 'your_client_id_here',
    clientSecret: process.env.LINUXDO_CLIENT_SECRET || 'your_client_secret_here',
    
    // LinuxDo OAuth2 端点
    authorizationURL: 'https://connect.linux.do/oauth2/authorize',
    tokenURL: 'https://connect.linux.do/oauth2/token',
    userInfoURL: 'https://connect.linux.do/api/user',
    
    // 回调地址
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3001/auth/linuxdo/callback',
    
    // OAuth2 scope
    scope: ['read']
  }
};
