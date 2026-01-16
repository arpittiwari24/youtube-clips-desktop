// Ad-hoc sign script for macOS
// This makes the app openable without terminal commands

const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log('Ad-hoc signing app to allow opening without terminal commands...');
  console.log('App path:', appPath);

  try {
    // Ad-hoc sign the entire app bundle
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: 'inherit'
    });
    console.log('✓ Ad-hoc signing completed successfully');
  } catch (error) {
    console.error('Ad-hoc signing failed:', error.message);
    console.log('⚠ App will require manual quarantine removal');
  }
};
