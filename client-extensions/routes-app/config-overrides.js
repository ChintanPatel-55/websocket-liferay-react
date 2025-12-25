module.exports = function override(config, env) {
    // Disable splitting (create one large file) and disable hashing
    config.optimization.splitChunks = {
        cacheGroups: {
            default: false,
        },
    };
    config.optimization.runtimeChunk = false;

    // Force consistent filename
    config.output.filename = 'static/js/bundle.js';

    // Handle CSS filename if needed
    if (config.plugins) {
        config.plugins.forEach((plugin) => {
            if (plugin.constructor.name === 'MiniCssExtractPlugin') {
                plugin.options.filename = 'static/css/bundle.css';
            }
        });
    }
    return config;
};