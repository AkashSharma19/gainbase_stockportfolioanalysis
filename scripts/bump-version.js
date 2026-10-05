const fs = require('fs');
const path = require('path');

const type = process.argv[2] || 'patch'; // 'patch', 'minor', 'major', 'build'

const appJsonPath = path.join(__dirname, '..', 'app.json');
const pkgJsonPath = path.join(__dirname, '..', 'package.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

let [major, minor, patch] = (appJson.expo.version || '1.0.0').split('.').map(Number);
let currentBuild = parseInt(appJson.expo.ios?.buildNumber || '1', 10);
let currentCode = appJson.expo.android?.versionCode || currentBuild;

if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
  currentBuild += 1;
  currentCode += 1;
} else if (type === 'minor') {
  minor += 1;
  patch = 0;
  currentBuild += 1;
  currentCode += 1;
} else if (type === 'patch') {
  patch += 1;
  currentBuild += 1;
  currentCode += 1;
} else if (type === 'build') {
  currentBuild += 1;
  currentCode += 1;
}

const newVersion = `${major}.${minor}.${patch}`;

appJson.expo.version = newVersion;
if (!appJson.expo.ios) appJson.expo.ios = {};
appJson.expo.ios.buildNumber = String(currentBuild);

if (!appJson.expo.android) appJson.expo.android = {};
appJson.expo.android.versionCode = currentCode;

pkgJson.version = newVersion;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');

console.log(`\n🚀 Version updated successfully!`);
console.log(`📦 App Version:  ${newVersion}`);
console.log(`📱 Build Number: ${currentBuild} (iOS buildNumber / Android versionCode)\n`);
