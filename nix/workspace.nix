{
  lib,
  stdenv,
  stdenvNoCC,
  autoPatchelfHook,
  fetchPnpmDeps,
  pnpmConfigHook,
  nodejs,
  pnpm,
  src,
  revision,
}:

stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "mash-workspace";
  version = "0.0.0";
  inherit src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 3;
    hash = "sha256-1P9AJuF+2hpJi8sCSP0PIr08r+sh1hjM98mA0qyd5BU=";
  };

  nativeBuildInputs = [
    nodejs
    pnpm
    pnpmConfigHook
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [ autoPatchelfHook ];
  buildInputs = lib.optionals stdenv.hostPlatform.isLinux [ stdenv.cc.cc.lib ];
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

  preBuild = lib.optionalString stdenv.hostPlatform.isLinux ''
    # rs-module-lexer ships a musl optional dependency without libc metadata,
    # so pnpm also installs it on glibc hosts. Only the GNU variant can load
    # into our Node; remove unused musl packages before checking ELF linkage.
    find node_modules/.pnpm -maxdepth 1 -type d -name '*-linux-*-musl@*' \
      -exec rm -rf {} +
    find node_modules -type l -name '*-linux-*-musl' -delete
    autoPatchelf node_modules
  '';

  buildPhase = ''
    runHook preBuild
    node nix/provenance.mjs ${lib.escapeShellArg (builtins.toJSON revision)}
    pnpm run build
    pnpm --filter @mash/catalog run build:iife
    runHook postBuild
  '';

  doCheck = true;
  checkPhase = ''
    runHook preCheck
    pnpm run check:types
    pnpm run check:exports
    test -s apps/catalog/dist/mash.js
    runHook postCheck
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -a . "$out/"
    # pnpm's bin shims embed NODE_PATH entries rooted in the build directory.
    # Relocate them, and discard timestamped, machine-local install caches.
    while IFS= read -r -d "" script; do
      substituteInPlace "$script" --replace-quiet "$PWD" "$out"
    done < <(find "$out" -type f -path '*/node_modules/.bin/*' -print0)
    rm "$out/node_modules/.modules.yaml" \
      "$out/node_modules/.pnpm-workspace-state-v1.json"
    runHook postInstall
  '';

  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    pnpm --dir "$out" --filter @mash/visual-tests exec playwright --version
    node --input-type=module - "$out" <<'JS'
    import { createRequire } from 'node:module';
    const require = createRequire(process.argv[2] + '/apps/catalog/package.json');
    require('esbuild').buildSync({stdin: {contents: 'export const ready = true'}, write: false});
    JS
    test ! -e "$out/node_modules/.pnpm-workspace-state-v1.json"
    runHook postInstallCheck
  '';

  # Keep the workspace links and platform-specific Node addons intact.
  dontStrip = true;
  meta = {
    description = "Built Mash packages, browser bundle, sources and locked JS dependencies";
    platforms = lib.platforms.unix;
  };
})
