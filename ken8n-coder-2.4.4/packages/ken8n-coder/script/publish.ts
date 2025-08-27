#!/usr/bin/env bun
const dir = new URL("..", import.meta.url).pathname
process.chdir(dir)
import { $ } from "bun"

import pkg from "../package.json"

const dry = process.env["KEN8N_CODER_DRY"] === "true"
const version = process.env["KEN8N_CODER_VERSION"] || ""
const snapshot = process.env["KEN8N_CODER_SNAPSHOT"] === "true"

console.log(`publishing ${version}`)

const GOARCH: Record<string, string> = {
  arm64: "arm64",
  x64: "amd64",
  "x64-baseline": "amd64",
}

const targets = [
  ["windows", "x64"],
  ["linux", "arm64"],
  ["linux", "x64"],
  ["linux", "x64-baseline"],
  ["darwin", "x64"],
  ["darwin", "x64-baseline"],
  ["darwin", "arm64"],
]

await $`rm -rf dist`

const optionalDependencies: Record<string, string> = {}
const npmTag = snapshot ? "snapshot" : "latest"
for (const [os, arch] of targets) {
  console.log(`building ${os}-${arch}`)
  const name = `${pkg.name}-${os}-${arch}`
  await $`mkdir -p dist/${name}/bin`
  await $`CGO_ENABLED=0 GOOS=${os} GOARCH=${GOARCH[arch]} go build -ldflags="-s -w -X main.Version=${version}" -o ../ken8n-coder/dist/${name}/bin/tui ../tui/cmd/ken8n-coder/main.go`.cwd(
    "../tui",
  )
  await $`bun build --define KEN8N_CODER_TUI_PATH="'../../../dist/${name}/bin/tui'" --define KEN8N_CODER_VERSION="'${version}'" --compile --target=bun-${os}-${arch} --outfile=dist/${name}/bin/ken8n-coder ./src/index.ts`
  // Run the binary only if it matches current OS/arch
  if (
    process.platform === (os === "windows" ? "win32" : os) &&
    (process.arch === arch || (process.arch === "x64" && arch === "x64-baseline"))
  ) {
    console.log(`smoke test: running dist/${name}/bin/ken8n-coder --version`)
    await $`./dist/${name}/bin/ken8n-coder --version`
  }
  await $`rm -rf ./dist/${name}/bin/tui`
  // Copy only the static validator (no dependencies needed)
  await $`mkdir -p ./dist/${name}/validation-scripts`
  await $`cp validation-scripts/validate-supercode-static.js ./dist/${name}/validation-scripts/ 2>/dev/null || true`
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version,
        os: [os === "windows" ? "win32" : os],
        cpu: [arch],
      },
      null,
      2,
    ),
  )
  if (!dry) await $`cd dist/${name} && chmod 777 -R . && bun publish --access public --tag ${npmTag}`
  optionalDependencies[name] = version
}

await $`mkdir -p ./dist/${pkg.name}`
await $`cp -r ./bin ./dist/${pkg.name}/bin`
await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
// Copy only the static validator (no dependencies needed)
await $`mkdir -p ./dist/${pkg.name}/validation-scripts`
await $`cp validation-scripts/validate-supercode-static.js ./dist/${pkg.name}/validation-scripts/ 2>/dev/null || true`
await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name + "-ai",
      bin: {
        [pkg.name]: `./bin/${pkg.name}`,
      },
      scripts: {
        postinstall: "node ./postinstall.mjs",
      },
      version,
      optionalDependencies,
    },
    null,
    2,
  ),
)
if (!dry) await $`cd ./dist/${pkg.name} && bun publish --access public --tag ${npmTag}`

if (!snapshot) {
  for (const key of Object.keys(optionalDependencies)) {
    await $`cd dist/${key} && zip -r ../${key}.zip *`
  }

  // Calculate SHA values
  const arm64Sha = await $`sha256sum ./dist/ken8n-coder-linux-arm64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const x64Sha = await $`sha256sum ./dist/ken8n-coder-linux-x64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const macX64Sha = await $`sha256sum ./dist/ken8n-coder-darwin-x64.zip | cut -d' ' -f1`.text().then((x) => x.trim())
  const macArm64Sha = await $`sha256sum ./dist/ken8n-coder-darwin-arm64.zip | cut -d' ' -f1`
    .text()
    .then((x) => x.trim())

  /* AUR package - commented out as AUR is down
  const pkgbuild = [
    "# Maintainer: dax",
    "# Maintainer: adam",
    "",
    "pkgname='${pkg}'",
    `pkgver=${version.split("-")[0]}`,
    "options=('!debug' '!strip')",
    "pkgrel=1",
    "pkgdesc='The AI coding agent built for the terminal.'",
    "url='https://github.com/sst/opencode'",
    "arch=('aarch64' 'x86_64')",
    "license=('MIT')",
    "provides=('opencode')",
    "conflicts=('opencode')",
    "depends=('fzf' 'ripgrep')",
    "",
    `source_aarch64=("\${pkgname}_\${pkgver}_aarch64.zip::https://github.com/sst/opencode/releases/download/v${version}/opencode-linux-arm64.zip")`,
    `sha256sums_aarch64=('${arm64Sha}')`,
    "",
    `source_x86_64=("\${pkgname}_\${pkgver}_x86_64.zip::https://github.com/sst/opencode/releases/download/v${version}/opencode-linux-x64.zip")`,
    `sha256sums_x86_64=('${x64Sha}')`,
    "",
    "package() {",
    '  install -Dm755 ./ken8n-coder "${pkgdir}/usr/bin/ken8n-coder"',
    "}",
    "",
  ].join("\n")

  for (const pkg of ["ken8n-coder-bin"]) {
    await $`rm -rf ./dist/aur-${pkg}`
    await $`git clone ssh://aur@aur.archlinux.org/${pkg}.git ./dist/aur-${pkg}`
    await $`cd ./dist/aur-${pkg} && git checkout master`
    await Bun.file(`./dist/aur-${pkg}/PKGBUILD`).write(pkgbuild.replace("${pkg}", pkg))
    await $`cd ./dist/aur-${pkg} && makepkg --printsrcinfo > .SRCINFO`
    await $`cd ./dist/aur-${pkg} && git add PKGBUILD .SRCINFO`
    await $`cd ./dist/aur-${pkg} && git commit -m "Update to v${version}"`
    if (!dry) await $`cd ./dist/aur-${pkg} && git push`
  }
  */

  // Homebrew formula
  const homebrewFormula = [
    "# typed: false",
    "# frozen_string_literal: true",
    "",
    "# This file was generated by GoReleaser. DO NOT EDIT.",
    "class Ken8nCoder < Formula",
    `  desc "AI-powered n8n workflow creation agent built for the terminal."`,
    `  homepage "https://github.com/kenkaiii/ken8n-coder"`,
    `  version "${version.split("-")[0]}"`,
    "",
    "  on_macos do",
    "    if Hardware::CPU.intel?",
    `      url "https://github.com/kenkaiii/ken8n-coder/releases/download/v${version}/ken8n-coder-darwin-x64.zip"`,
    `      sha256 "${macX64Sha}"`,
    "",
    "      def install",
    '        bin.install "ken8n-coder"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm?",
    `      url "https://github.com/kenkaiii/ken8n-coder/releases/download/v${version}/ken8n-coder-darwin-arm64.zip"`,
    `      sha256 "${macArm64Sha}"`,
    "",
    "      def install",
    '        bin.install "ken8n-coder"',
    "      end",
    "    end",
    "  end",
    "",
    "  on_linux do",
    "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/kenkaiii/ken8n-coder/releases/download/v${version}/ken8n-coder-linux-x64.zip"`,
    `      sha256 "${x64Sha}"`,
    "      def install",
    '        bin.install "ken8n-coder"',
    "      end",
    "    end",
    "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
    `      url "https://github.com/kenkaiii/ken8n-coder/releases/download/v${version}/ken8n-coder-linux-arm64.zip"`,
    `      sha256 "${arm64Sha}"`,
    "      def install",
    '        bin.install "ken8n-coder"',
    "      end",
    "    end",
    "  end",
    "end",
    "",
    "",
  ].join("\n")

  await $`rm -rf ./dist/homebrew-tap`
  await $`git clone https://${process.env["GITHUB_TOKEN"]}@github.com/kenkaiii/homebrew-tap.git ./dist/homebrew-tap`
  await Bun.file("./dist/homebrew-tap/ken8n-coder.rb").write(homebrewFormula)
  await $`cd ./dist/homebrew-tap && git add ken8n-coder.rb`
  await $`cd ./dist/homebrew-tap && git commit -m "Update to v${version}"`
  if (!dry) await $`cd ./dist/homebrew-tap && git push`
}
