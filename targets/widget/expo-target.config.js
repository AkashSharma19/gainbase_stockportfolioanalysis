/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'GainbaseWidget',
  bundleIdentifier: 'com.akashsharma.gainbase.widget',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.akashsharma.gainbase'],
  },
};
