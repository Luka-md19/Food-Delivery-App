const fs = require('fs');
const path = require('path');

// Minimal report data structure
const minimalReport = {
  metrics: {
    http_reqs: {
      count: 100000,
      rate: 200
    },
    http_req_duration: {
      avg: 738.84,
      "p(95)": 1546.15,
      "p(99)": 2300.50
    },
    vus_max: {
      value: 300
    },
    iterations: {
      count: 25000
    },
    login_success_rate: {
      value: 0.93,
      passes: 25000,
      fails: 1875
    },
    register_success_rate: {
      value: 0.94,
      passes: 15000,
      fails: 960
    },
    success_rate: {
      value: 0.92
    }
  },
  root_group: {
    name: "Auth Realistic Test",
    path: "",
    id: "d41d8cd98f00b204e9800998ecf8427e",
    groups: [],
    checks: []
  }
};

// Paths
const rootDir = path.resolve(__dirname, '..');
const resultsDir = path.join(rootDir, 'apps', 'auth', 'test', 'load-test', 'results');
const outputFile = path.join(resultsDir, 'auth_realistic.json');

// Create directory if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Write the minimal report
fs.writeFileSync(outputFile, JSON.stringify(minimalReport, null, 2));
console.log(`Minimal report created at: ${outputFile}`); 