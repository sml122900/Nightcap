const fs = require('fs/promises');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require('@expo/config-plugins');

const SHORTCUT_ID = 'nightcap_capture';
const SHORT_LABEL_KEY = 'nightcap_share_shortcut_short_label';
const LONG_LABEL_KEY = 'nightcap_share_shortcut_long_label';
const META_DATA_NAME = 'android.app.shortcuts';

/**
 * Sharing Shortcuts (Direct Share) registration — puts "Nightcap에 담기" in the share sheet's top
 * row so the user doesn't have to hunt through "더보기" every time (W3-3 B).
 *
 * expo-share-intent already installs the ACTION_SEND intent-filter on .MainActivity; this only
 * adds the shortcuts.xml <share-target> pointing at that same activity, so the shared payload
 * still arrives through the existing useShareIntent() path. It's a config plugin rather than a
 * hand-edit of android/ because `expo prebuild` regenerates that folder every time (same reason
 * as plugins/withKotlinJvmTargetFix.js).
 *
 * The <shortcut> itself launches ACTION_MAIN, not ACTION_SEND: a launcher long-press would
 * otherwise deliver an ACTION_SEND intent with no payload and the app would try to ingest
 * nothing. Share-sheet selections don't use that intent — the system delivers the original
 * ACTION_SEND to `targetClass` instead.
 */
function shortcutsXml(packageName) {
  const targetClass = `${packageName}.MainActivity`;
  const shareCategory = `${packageName}.category.SHARE_TARGET`;
  return `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
      android:shortcutId="${SHORTCUT_ID}"
      android:enabled="true"
      android:icon="@mipmap/ic_launcher"
      android:shortcutShortLabel="@string/${SHORT_LABEL_KEY}"
      android:shortcutLongLabel="@string/${LONG_LABEL_KEY}">
    <intent
        android:action="android.intent.action.MAIN"
        android:targetPackage="${packageName}"
        android:targetClass="${targetClass}" />
    <categories android:name="${shareCategory}" />
  </shortcut>
  <share-target android:targetClass="${targetClass}">
    <data android:mimeType="text/*" />
    <data android:mimeType="image/*" />
    <category android:name="${shareCategory}" />
  </share-target>
</shortcuts>
`;
}

module.exports = function withDirectShareShortcut(config) {
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        { $: { name: SHORT_LABEL_KEY, translatable: 'false' }, _: 'Nightcap' },
        { $: { name: LONG_LABEL_KEY, translatable: 'false' }, _: 'Nightcap에 담기' },
      ],
      config.modResults
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity['meta-data'] = (activity['meta-data'] ?? []).filter(
      (item) => item.$['android:name'] !== META_DATA_NAME
    );
    activity['meta-data'].push({ $: { 'android:name': META_DATA_NAME, 'android:resource': '@xml/shortcuts' } });
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android?.package;
      if (!packageName) throw new Error('withDirectShareShortcut: android.package is not set');
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      await fs.mkdir(xmlDir, { recursive: true });
      await fs.writeFile(path.join(xmlDir, 'shortcuts.xml'), shortcutsXml(packageName), 'utf8');
      return config;
    },
  ]);
};
