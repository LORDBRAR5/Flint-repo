/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites(){
    const api=(process.env.INTERNAL_API_URL||'http://api:4000').replace(/\/$/,'');
    return [{source:'/auth/:path*',destination:`${api}/auth/:path*`},{source:'/me',destination:`${api}/me`},{source:'/ready',destination:`${api}/ready`},{source:'/health',destination:`${api}/health`},{source:'/servers/:path*',destination:`${api}/servers/:path*`},{source:'/coins/:path*',destination:`${api}/coins/:path*`},{source:'/catalog/:path*',destination:`${api}/catalog/:path*`},{source:'/staff/:path*',destination:`${api}/staff/:path*`}];
  },
  async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(),microphone=(),geolocation=()'},{key:'Content-Security-Policy',value:"default-src 'self'; connect-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}]}]}
  }
};
module.exports=nextConfig;
