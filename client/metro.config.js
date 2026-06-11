const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Buộc Expo Router phải sử dụng chế độ này
  isCSSEnabled: true,
});

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Đây là dòng "sinh tử" để sửa lỗi require.context
config.transformer.unstable_allowRequireContext = true;

module.exports = config;