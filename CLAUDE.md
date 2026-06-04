# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this project is

**BitGen** is a client-side **Bitcoin wallet generator**. It is a single,
self-contained static web page that generates a BIP39 mnemonic, derives a
Bitcoin key pair, and displays the private key (HEX + WIF), compressed public
key, P2PKH (Legacy, `1...`) address, and QR codes — entirely in the browser.
No data is ever sent to a server.

The UI is written in **Korean**. Keep new user-facing copy in Korean to match.

> ⚠️ This is an educational/demo tool. The README/UI explicitly warn against
> using generated keys to store real funds. Preserve those warnings.

## Repository layout

This is a tiny repo — there is no build step and no framework.

| Path                | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `index.html`        | **The entire application.** HTML, CSS, and JS are all inline here.       |
| `test.js`           | Node test for `publicKeyToAddress` (address derivation).                |
| `test_base58.js`    | Node test for `base58Encode`.                                           |
| `package.json`      | Declares `npm test`; lists `crypto-js` as a dependency.                 |
| `package-lock.json` | Lockfile.                                                               |
| `.gitignore`        | Ignores `node_modules/`.                                                |

There is no `src/`, no bundler, and no `.github/workflows/`. The site is served
as a static page (GitHub Pages).

## How the app works (`index.html`)

Everything lives in `index.html`, split into two inline `<script>` blocks:

1. **CDN loader (in `<head>`)** — sequentially loads four crypto libraries,
   each with multiple CDN fallbacks (jsDelivr → unpkg → cdnjs) and **SRI
   `integrity` hashes**. On success it shows `#readyBanner`; if every fallback
   fails it shows `#loadError`. The libraries are:
   - `ethers` v6.13.4 — BIP39 mnemonic + BIP32 HD derivation + hex utils
   - `elliptic` v6.5.4 — secp256k1 public-key derivation
   - `crypto-js` v4.2.0 — SHA-256 / RIPEMD-160
   - `qrcodejs` v1.0.0 — QR code rendering

2. **Wallet logic (before `</body>`)** — pure functions plus the
   `generateWallet()` entry point wired to the Generate button.

### Key generation pipeline (`generateWallet`)

1. `ethers.randomBytes(16)` → 128 bits of entropy.
2. `ethers.Mnemonic.fromEntropy(...)` → standard BIP39 12-word phrase.
3. `ethers.HDNodeWallet.fromPhrase(mnemonic, '', "m/44'/0'/0'/0/0")` → private key.
4. `elliptic`'s `secp256k1` → **compressed** public key.
5. `privateKeyToWIF` → WIF (version `0x80` + key + `0x01` compressed flag, Base58Check).
6. `publicKeyToAddress` → SHA-256 → RIPEMD-160 → Base58Check (version `0x00`) → `1...` address.

### Important inline functions

- `base58Encode(bytes)` / `base58CheckEncode(versionByte, payload)`
- `sha256`, `sha256Twice`, `ripemd160`, `wordArrayToUint8`, `hexToBytes`, `bytesToHex`
- `privateKeyToWIF`, `publicKeyToAddress`
- `generateQR`, `copyField`, `copyMnemonic`, `showToast`

The `secp256k1` curve instance is cached in `_cachedEc`; the current phrase is
held in `_currentMnemonic` for the "copy all words" button.

## Development workflow

There is no install step needed to run the app — just open `index.html` in a
browser (it pulls libraries from CDNs, so it needs network access on first
load). For a local server: `python3 -m http.server` and visit the page.

### Tests — run before every commit

```bash
npm test          # runs: node test.js && node test_base58.js
```

> ⚠️ **Known state:** `test.js` passes (3/3). `test_base58.js` currently
> **fails** (1/6) because `base58Encode` in `index.html` calls
> `ethers.hexlify(bytes)`, but `test_base58.js`'s `vm` sandbox never provides an
> `ethers` mock — so every non-empty case returns `undefined`. The fix is to add
> an `ethers` mock (like the one in `test.js`) to the `test_base58.js` sandbox.
> Because `npm test` chains with `&&`, the base58 failure also makes the whole
> `npm test` command exit non-zero. Keep this in mind before relying on a green
> suite.

Both tests are zero-dependency: they use Node's built-in `assert`, `vm`, and
`crypto`. Crucially, **the tests do not import the app as a module** — they:

1. `fs.readFileSync('index.html')`,
2. regex-extract the `<script>` block that contains a marker function
   (`publicKeyToAddress` in `test.js`, `base58Encode` in `test_base58.js`),
3. run that script inside a `vm` sandbox with **mocked** `CryptoJS`, `ethers`,
   `elliptic`, `document`, etc.,
4. call the now-global functions with known test vectors.

**Consequences for editing `index.html`:**

- Keep `base58Encode` and `publicKeyToAddress` (and their dependencies) inside
  the **same** `<script>` block, defined as top-level `function` declarations
  with those exact names. Renaming or moving them to a separate block will break
  test extraction.
- If you change the crypto math, update/verify the test vectors in `test.js`
  (real Bitcoin addresses like `1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs`) and
  `test_base58.js`.
- The Node test mocks (`test.js`/`test_base58.js`) only stub the parts of
  `ethers`/`CryptoJS` the tested functions touch. If a tested function starts
  using a new library method, extend the corresponding sandbox mock.

### Changing a CDN library version

When bumping any library version in the `<head>` loader, you **must** regenerate
the matching SRI `integrity` hash for every fallback URL, e.g.:

```bash
curl -s <library-url> | openssl dgst -sha384 -binary | openssl base64 -A
# prefix the result with "sha384-"
```

Mismatched SRI hashes silently block the script and trip `#loadError`.

## Conventions

- **Single-file app**: prefer keeping HTML/CSS/JS in `index.html` unless there's
  a strong reason to split. There is no build tooling to bundle separate files.
- **No external runtime deps beyond the four CDN libs**; don't introduce a
  framework or bundler without discussion.
- **Korean UI copy**; keep the security warnings intact.
- **Preserve the "everything runs locally" property** — never add code that
  transmits keys, mnemonics, or entropy off the page.
- CSS uses the `:root` custom-property theme (Bitcoin-orange on dark). Reuse the
  existing variables (`--bitcoin-orange`, `--bg-card`, `--radius`, etc.).

## Git / PR workflow

- Branch names in history follow descriptive prefixes
  (`fix-...`, `refactor-...`, `performance-...`, `testing-...`).
- Changes land via pull requests that are squash/merge-committed into `main`.
- Run `npm test` and confirm the page still generates a wallet before opening a PR.
