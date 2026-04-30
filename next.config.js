const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'via.placeholder.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.rentcast.io',
            },
            {
                protocol: 'https',
                hostname: 'images.rentcast.io',
            },
            {
                protocol: 'https',
                hostname: 'media.rentcast.io',
            },
        ],
    },
    turbopack: {},
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = Object.assign(Object.assign({}, config.resolve.fallback), { fs: false, dns: false, net: false, tls: false });
        }
        return config;
    },
};
export default nextConfig;
