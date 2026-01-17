const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_PASSWORD || process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('⚠️  Skipping notarization: Apple credentials not found');
    return;
  }

  console.log('🍎 Notarizing app...');
  console.log(`   App path: ${appPath}`);
  console.log(`   Team ID: ${teamId}`);
  console.log(`   Apple ID: ${appleId}`);

  try {
    const startTime = Date.now();

    await notarize({
      tool: 'notarytool',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Notarization successful! (took ${duration}s)`);
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
