const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const CryptoJS = require('crypto-js');

// Load HTML file
const html = fs.readFileSync('index.html', 'utf8');

// Extract script content
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!scriptMatches) {
  console.error("Failed to find any <script> tags in index.html");
  process.exit(1);
}

const mainScriptMatch = scriptMatches.find(s => s.includes('function publicKeyToAddress'));
if (!mainScriptMatch) {
  console.error("Failed to find script containing publicKeyToAddress");
  process.exit(1);
}

const code = mainScriptMatch.replace(/<\/?script>/g, '');

// Create a sandbox context similar to browser environment
const sandbox = {
  CryptoJS,
  BigInt,
  Uint8Array,
  Array,
  Number,
  parseInt,
  console,
  document: {
    getElementById: () => ({
      classList: { add: () => {}, remove: () => {} },
      style: {}
    }),
    createElement: () => ({ appendChild: () => {} })
  },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  ethers: { randomBytes: () => new Uint8Array(16), Mnemonic: { entropyToPhrase: () => '' }, HDNodeWallet: { fromPhrase: () => ({ privateKey: '0x00' }) } },
  elliptic: { ec: class { keyFromPrivate() { return { getPublic: () => '00' } } } },
  generateQR: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  window: {}
};

// Evaluate the script within the sandbox
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// Define test cases
const testCases = [
  {
    name: "Satoshi Address (Compressed)",
    pubKeyHex: "0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352",
    expectedAddr: "1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs"
  },
  {
    name: "PrivateKey 1",
    pubKeyHex: "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    expectedAddr: "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
  },
  {
    name: "PrivateKey FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140",
    pubKeyHex: "0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    expectedAddr: "1GrLCmVQXoyJXaPJQdqssNqwxvha1eUo2E"
  }
];

let passed = 0;
let failed = 0;

console.log("Running tests for publicKeyToAddress...");

for (const testCase of testCases) {
  try {
    const pubKeyBytes = sandbox.hexToBytes(testCase.pubKeyHex);
    const actualAddr = sandbox.publicKeyToAddress(pubKeyBytes);

    assert.strictEqual(actualAddr, testCase.expectedAddr);
    console.log(`✅ ${testCase.name} Passed`);
    passed++;
  } catch (err) {
    console.error(`❌ ${testCase.name} Failed:`);
    console.error(`   Expected: ${testCase.expectedAddr}`);
    console.error(`   Actual:   ${err.actual}`);
    failed++;
  }
}

console.log("\n--- Test Summary ---");
console.log(`Total:  ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
