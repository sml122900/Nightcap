const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// nightcap: force consistent Kotlin/Java JVM target (react-native-image-colors compileReleaseKotlin fix)';

// react-native-image-colors' own build.gradle only sets sourceCompatibility/jvmTarget when
// AGP < 8 (dead code on this project's AGP 8+), so its compileReleaseKotlin task falls back to
// whatever JDK is running Gradle (21 here) while javac stays on the project's Java 17 —
// "Inconsistent JVM-target compatibility" build failure. Forcing every subproject to 17 (the
// same target the rest of the app already compiles against) fixes it without patching
// node_modules, and survives `expo prebuild` regenerating android/ since it's a config plugin.
// Uses pluginManager.withPlugin/tasks.withType instead of afterEvaluate — with
// --configure-on-demand, some subprojects are already fully evaluated by the time this script's
// tail runs, and afterEvaluate throws ("Cannot run Project.afterEvaluate(Closure) when the
// project is already evaluated") on those. withPlugin/withType callbacks fire on plugin
// application / task creation instead, so they're safe regardless of evaluation state.
const SNIPPET = `
${MARKER}
subprojects { subproject ->
  subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    kotlinOptions {
      jvmTarget = "17"
    }
  }
  ['com.android.library', 'com.android.application'].each { pluginId ->
    subproject.pluginManager.withPlugin(pluginId) {
      subproject.android {
        compileOptions {
          sourceCompatibility JavaVersion.VERSION_17
          targetCompatibility JavaVersion.VERSION_17
        }
      }
    }
  }
}
`;

module.exports = function withKotlinJvmTargetFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += SNIPPET;
    }
    return config;
  });
};
