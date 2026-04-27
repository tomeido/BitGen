const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Read index.html and extract the main script block
const html = fs.readFileSync('index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!scripts || scripts.length < 2) {
    throw new Error('Could not find the expected script blocks in index.html');
}

// The second script block contains the wallet logic
let mainScript = scripts[1].replace(/<\/?script>/g, '');

// 2. Set up a minimal sandbox environment
const sandbox = {
  document: {
    getElementById: () => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      textContent: ''
    }),
    querySelectorAll: () => [],
    createElement: () => ({ appendChild: () => {} })
  },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  ethers: {
    randomBytes: () => new Uint8Array(16),
    Mnemonic: { entropyToPhrase: () => '' },
    HDNodeWallet: { fromPhrase: () => ({ privateKey: '0x01' }) }
  },
  elliptic: {
    ec: class { keyFromPrivate() { return { getPublic: () => '' }; } }
  },
  CryptoJS: {
    lib: { WordArray: { create: () => {} } },
    SHA256: () => {},
    RIPEMD160: () => {},
    enc: { Hex: {} }
  },
  QRCode: class {},
  alert: () => {},
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  BigInt: BigInt,
  Array: Array,
  Number: Number,
  Promise: Promise,
  Uint8Array: Uint8Array,
  parseInt: parseInt
};

vm.createContext(sandbox);

// 3. Run the script in the sandbox to populate functions like base58Encode
vm.runInContext(mainScript, sandbox);

const base58Encode = sandbox.base58Encode;
if (typeof base58Encode !== 'function') {
    throw new Error('base58Encode function was not found in the sandbox.');
}

// Helper to convert hex string to Uint8Array for testing
function hexToBytes(hex) {
    if (hex.length === 0) return new Uint8Array(0);
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return arr;
}

// 4. Test Vectors
const vectors = [
  { hex: "", expected: "", desc: "Empty array" },
  { hex: "00", expected: "1", desc: "Single leading zero" },
  { hex: "0000", expected: "11", desc: "Multiple leading zeros" },
  { hex: "000000", expected: "111", desc: "More leading zeros" },
  { hex: "61", expected: "2g", desc: "Simple char 'a'" },
  { hex: "626262", expected: "a3gV", desc: "Simple string 'bbb'" },
  { hex: "000111d38e5fc9071ffcd20b4a763cc9ae4f252bb4e48fd66a835e252ada93ff480d6dd43dc62a641155a5", expected: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", desc: "Full alphabet" },
  { hex: "516b6fcd0f", expected: "ABnLTmg", desc: "Random bytes 1" },
  { hex: "bf4f89001e670274dd", expected: "3SEo3LWLoPntC", desc: "Random bytes 2" },
  { hex: "572e4794", expected: "3EFU7m", desc: "Random bytes 3" },
  { hex: "ecac89cad93923c02321", expected: "EJDM8drfXA6uyA", desc: "Random bytes 4" },
  { hex: "10c8511e", expected: "Rt5zm", desc: "Random bytes 5" },
  { hex: "00000000000000000000", expected: "1111111111", desc: "All zeros" }
];

console.log('Running base58Encode tests...');
let passedCount = 0;

for (const { hex, expected, desc } of vectors) {
  const bytes = hexToBytes(hex);
  const result = base58Encode(bytes);

  try {
    assert.strictEqual(result, expected);
    console.log(`✅ PASS: ${desc} (Hex: "${hex}" -> "${result}")`);
    passedCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(`   Expected: "${expected}"`);
    console.error(`   Got:      "${result}"`);
    console.error(`   Input hex: ${hex}`);
    process.exit(1);
  }
}

console.log(`\n🎉 All ${passedCount} tests passed successfully!`);
