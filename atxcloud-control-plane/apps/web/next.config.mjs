const nextConfig={async rewrites(){return [{source:'/api/:path*',destination:`${process.env.API_URL||'http://api:4000'}/:path*`}]}};
export default nextConfig;
