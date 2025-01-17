const semver = require("semver");
const lookupVersion = require("../lib/utils");

const parseVersion = (version) => {
  return semver.parse(semver.coerce(version), true);
}

const diffLoose = (version1, version2) => {
  if (version1 === version2) {
    return null;
  }

  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  if (semver.lt(v2, v1) || semver.eq(v1, v2, true)) {
    return null;
  }

  let prefix = "";
  let defaultResult = null;
  if (v1.prerelease.length || v2.prerelease.length) {
    prefix = "pre";
    defaultResult = "prerelease";
  }
  for (let key in v1) {
    if (v1.hasOwnProperty(key) && ["major", "minor", "patch"].includes(key) && v1[key] !== v2[key]) {
      return prefix + key;
    }
  }
  return defaultResult;
};

const versionCompare = (currentVersion, latestVersion) => {
  if (!latestVersion) {
    return {
      needsUpdate: false,
      updateType: null,
      notice: "Error: could not get latest version"
    };
  }

  try {
    const updateType = diffLoose(currentVersion, latestVersion);
    return {
      needsUpdate: !!updateType,
      updateType
    };
  } catch (e) {
    let needsUpdate = currentVersion !== latestVersion && (latestVersion > currentVersion);
    if (!latestVersion.includes('.') || latestVersion.split('.').length < 3) {
      // Not a valid semver, so don't ever ask to update
      needsUpdate = false;
    }
    const updateType = needsUpdate ? "minor" : null;
    return {
      needsUpdate,
      updateType,
      notice: e.message.replace(/^Invalid Version:/, "Not a valid semver version:")
    };
  }
};

module.exports.handler = async({ pathParameters: { platform, bundleId, currentVersion }, queryStringParameters }) => {
  try {
    const country = queryStringParameters && queryStringParameters.country || 'us';
    const data = await lookupVersion(platform, bundleId, country);
    const version = versionCompare(currentVersion, data.version);
    return {
      statusCode: 200,
      body: JSON.stringify({ platform, bundleId, ...data, ...version })
    };
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: e.message || e })
    };
  }
};

module.exports.versionCompare = versionCompare;
