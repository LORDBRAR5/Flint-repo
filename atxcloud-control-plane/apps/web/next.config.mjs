const api=process.env.API_URL||'http://api:4000';
const nextConfig={
  async rewrites(){
    return [
      {source:'/api/:path*',destination:`${api}/:path*`},
      {source:'/auth/:path*',destination:`${api}/auth/:path*`},
      {source:'/me',destination:`${api}/me`},
      {source:'/servers/:path*',destination:`${api}/servers/:path*`},
      {source:'/catalog/:path*',destination:`${api}/catalog/:path*`},
      {source:'/control/:path*',destination:`${api}/control/:path*`},
      {source:'/internal/:path*',destination:`${api}/internal/:path*`},
      {source:'/coins/:path*',destination:`${api}/coins/:path*`},
      {source:'/health',destination:`${api}/health`},
      {source:'/ready',destination:`${api}/ready`}
    ];
  }
};
export default nextConfig;
