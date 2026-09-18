{
  description = "Mash Web Components and development tools";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      manifest = builtins.fromJSON (builtins.readFile ./package.json);
      forSystem =
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          nodejs = pkgs.nodejs_22;
          pnpm = pkgs.pnpm_10.override {
            inherit nodejs;
            version = nixpkgs.lib.removePrefix "pnpm@" manifest.packageManager;
            hash = "sha256-v8wby60nmxOlFsRGp1s8WLaQS0XVehlRQRAV5Qt1GoA=";
          };
          workspace = pkgs.callPackage ./nix/workspace.nix {
            inherit nodejs pnpm;
            src = self;
            revision = self.rev or null;
          };
        in
        {
          inherit
            pkgs
            nodejs
            pnpm
            workspace
            ;
        };
    in
    {
      packages = forAllSystems (
        system:
        let
          tools = forSystem system;
        in
        {
          inherit (tools) nodejs pnpm workspace;
          default = tools.workspace;
        }
      );

      devShells = forAllSystems (
        system:
        let
          tools = forSystem system;
        in
        {
          default = tools.pkgs.mkShell {
            packages = [
              tools.nodejs
              tools.pnpm
            ];
          };
        }
      );

      checks = forAllSystems (system: {
        workspace = self.packages.${system}.workspace;
      });
    };
}
