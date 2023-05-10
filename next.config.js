/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/scenes/game-scene",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
