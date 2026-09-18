# Nix builds

The flake supports x86_64 and aarch64 on Linux and macOS. `flake.lock` pins
nixpkgs; the pnpm tarball and the complete `pnpm-lock.yaml` dependency store
have fixed hashes. Node 22 and pnpm are shared by the shell and package build.

## Work on Mash

```sh
nix develop
pnpm install --frozen-lockfile
pnpm dev
```

The shell supplies tools without installing dependencies or changing the
checkout on entry. Install the matching browser once before browser tests:

```sh
pnpm --filter @mash/visual-tests exec playwright install chromium
pnpm test:browser
```

## Build and check

```sh
nix build
nix flake check
```

The default package, also named `workspace`, builds the component packages
and `apps/catalog/dist/mash.js`, then runs type and package-export checks.
It installs the built workspace, source files and locked Node dependencies
in `result/`. Dependency installation during the build is offline. Browsers
are not downloaded by the derivation, and browser suites remain separate.

`mash-nix.json` records the source revision, source digest and package manager.
A dirty or path-only flake input has a null revision and `dirty: true`;
consumers requiring release provenance should reject it. The digest uses
the same package/source selection as Shrine's checkout build; the Nix source
and derivation additionally capture the complete build input.

## Consume the flake

Pin a reviewed Mash commit as an input and expose its workspace and tools:

```nix
{
  inputs.mash.url = "github:axsys-org/mash/<reviewed-commit>";

  outputs = { nixpkgs, mash, ... }: {
    devShells.aarch64-darwin.default =
      let
        pkgs = nixpkgs.legacyPackages.aarch64-darwin;
        tools = mash.packages.aarch64-darwin;
      in pkgs.mkShell {
        packages = [ tools.nodejs tools.pnpm ];
        MASH_NIX_ROOT = "${tools.workspace}";
      };
  };
}
```

Use the relevant system instead of `aarch64-darwin`. Consumers may make
`mash.inputs.nixpkgs.follows = "nixpkgs"` to share a compatible nixpkgs pin.
The workspace is immutable: read its assets and resolve its dependencies,
rather than running `pnpm install` or rebuilding in its store directory.

## Update dependencies

After changing `pnpm-lock.yaml` or a dependency patch, set `hash = ""` in
`nix/workspace.nix`, run `nix build`, and replace it with the reported
`got: sha256-...` value. Build again to verify the offline install.
When changing `packageManager`, also update the pnpm tarball hash in
`flake.nix`. Update nixpkgs intentionally with `nix flake update nixpkgs`.
