import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for test result metrics
 */
export interface TestMetrics {
  // General metrics - JSONL format
  http_reqs?: { count: number; rate: number } | { values: { count: number; rate: number } };
  iteration_duration?: { values: { avg: number } } | { avg: number };
  iterations?: { count: number };
  http_req_duration?: 
    { values: { avg: number; 'p(95)': number; 'p(99)'?: number } } | 
    { avg: number; 'p(95)': number; 'p(99)'?: number };
  http_req_failed?: 
    { values: { rate: number } } | 
    { value: number; rate: number };
  vus_max?: { value: number };
  
  // Service-specific metrics - using index signature for flexibility across services
  [key: string]: any;
}

/**
 * Interface for root group data
 */
export interface RootGroup {
  groups: any[];
  checks?: any[];
  name?: string;
  path?: string;
  id?: string;
}

/**
 * Interface for threshold results
 */
export interface ThresholdResult {
  metric: string;
  threshold: string;
  value: string;
  passed: boolean;
}

/**
 * Interface for response time metrics
 */
export interface ResponseTimeMetrics {
  [operation: string]: {
    avg: string;
    p95: string;
    p99?: string;
  };
}

/**
 * Interface for success rate metrics
 */
export interface SuccessRateMetrics {
  [operation: string]: {
    rate: number;
    count: number;
  };
}

/**
 * Interface for test details
 */
export interface TestDetails {
  name: string;
  duration: string;
  vus: number;
  date: string;
  iterations: number;
  failRate: number;
}

/**
 * HTML Report Generator for load testing
 */
export class HtmlReportGenerator {
  /**
   * Generate an HTML report from a k6 JSON results file
   * 
   * @param jsonFilePath Path to the JSON results file
   * @param reportName Name of the test (e.g., "Baseline Test")
   * @param outputPath Path to save the HTML report
   * @param serviceName Name of the service (e.g., "auth", "menu")
   * @returns boolean indicating success
   */
  static generateReport(jsonFilePath: string, reportName: string, outputPath: string, serviceName: string): boolean {
    try {
      // Read the file content
      const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
      let metrics: TestMetrics = {};
      let rootGroup: RootGroup = { groups: [] };
      
      // Check if this is a summary JSON file or a raw JSONL file
      const isSummaryFile = jsonFilePath.includes('_summary.json') || fileContent.trim().startsWith('{');
      
      if (isSummaryFile) {
        // Process as a summary JSON file
        try {
          // Parse the entire file as a single JSON object
          const summaryData = JSON.parse(fileContent);
          
          // Extract metrics
          if (summaryData.metrics) {
            metrics = summaryData.metrics;
            
            // Format specific metrics properly
            if (metrics.http_reqs) {
              metrics.http_reqs = {
                count: this.getValueFromMetric<number>(metrics.http_reqs, 'count') || 0,
                rate: this.getValueFromMetric<number>(metrics.http_reqs, 'rate') || 0
              };
            }
            
            if (metrics.iterations) {
              metrics.iterations = {
                count: this.getValueFromMetric<number>(metrics.iterations, 'count') || 0
              };
            }
            
            if (metrics.vus_max) {
              metrics.vus_max = {
                value: this.getValueFromMetric<number>(metrics.vus_max, 'value') || 0
              };
            }
          }
          
          // Process thresholds from the root data
          if (summaryData.root_group) {
            rootGroup = summaryData.root_group;
            
            // Initialize groups array if it's an object or missing
            if (!Array.isArray(rootGroup.groups)) {
              rootGroup.groups = Object.keys(rootGroup.groups || {}).map(key => {
                return rootGroup.groups[key];
              });
            }
            
            // Initialize checks array if it's an object or missing
            if (!Array.isArray(rootGroup.checks)) {
              rootGroup.checks = Object.keys(rootGroup.checks || {}).map(key => {
                return {
                  name: key,
                  ...rootGroup.checks[key]
                };
              });
            }
          }
        } catch (jsonError) {
          console.error(`Failed to parse summary JSON file: ${jsonError.message}`);
          return false;
        }
      } else {
        // Process as a raw JSONL file (existing implementation)
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
        
        // Process each line to find metrics data
        for (const line of lines) {
          try {
            const lineData = JSON.parse(line);
            
            // Look for metric definitions and data points
            if (lineData.type === 'Metric' && lineData.data) {
              // Initialize the metric if it doesn't exist
              if (!metrics[lineData.metric]) {
                metrics[lineData.metric] = {
                  values: {}
                };
              }
            }
            
            // Look for metric data points
            if (lineData.type === 'Point' && lineData.metric && lineData.data) {
              if (!metrics[lineData.metric]) {
                metrics[lineData.metric] = {
                  values: {}
                };
              }
              
              // Store the latest value for the metric
              if (lineData.data.value !== undefined) {
                // Create structure based on the metric type
                if (lineData.metric === 'http_reqs') {
                  if (!metrics.http_reqs) metrics.http_reqs = { values: { count: 0, rate: 0 } };
                  
                  // Ensure we're working with the right format
                  if ('values' in metrics.http_reqs) {
                    if (lineData.data.tags?.statistic === 'rate') {
                      metrics.http_reqs.values.rate = lineData.data.value;
                    } else {
                      metrics.http_reqs.values.count = lineData.data.value;
                    }
                  } else {
                    if (lineData.data.tags?.statistic === 'rate') {
                      metrics.http_reqs.rate = lineData.data.value;
                    } else {
                      metrics.http_reqs.count = lineData.data.value;
                    }
                  }
                } else if (lineData.metric === 'iteration_duration') {
                  if (!metrics.iteration_duration) metrics.iteration_duration = { values: { avg: 0 } };
                  
                  if ('values' in metrics.iteration_duration) {
                    metrics.iteration_duration.values.avg = lineData.data.value;
                  } else {
                    metrics.iteration_duration.avg = lineData.data.value;
                  }
                } else if (lineData.metric === 'iterations') {
                  if (!metrics.iterations) metrics.iterations = { count: 0 };
                  metrics.iterations.count = lineData.data.value;
                } else if (lineData.metric === 'http_req_duration') {
                  if (!metrics.http_req_duration) {
                    metrics.http_req_duration = { 
                      values: { 
                        avg: 0, 
                        'p(95)': 0,
                        'p(99)': 0
                      } 
                    };
                  }
                  
                  if ('values' in metrics.http_req_duration) {
                    if (lineData.data.tags?.statistic === 'avg') {
                      metrics.http_req_duration.values.avg = lineData.data.value;
                    } else if (lineData.data.tags?.statistic === 'p(95)') {
                      metrics.http_req_duration.values['p(95)'] = lineData.data.value;
                    } else if (lineData.data.tags?.statistic === 'p(99)') {
                      metrics.http_req_duration.values['p(99)'] = lineData.data.value;
                    }
                  } else {
                    if (lineData.data.tags?.statistic === 'avg') {
                      metrics.http_req_duration.avg = lineData.data.value;
                    } else if (lineData.data.tags?.statistic === 'p(95)') {
                      metrics.http_req_duration['p(95)'] = lineData.data.value;
                    } else if (lineData.data.tags?.statistic === 'p(99)') {
                      metrics.http_req_duration['p(99)'] = lineData.data.value;
                    }
                  }
                } else if (lineData.metric === 'http_req_failed') {
                  if (!metrics.http_req_failed) metrics.http_req_failed = { values: { rate: 0 } };
                  
                  if ('values' in metrics.http_req_failed) {
                    metrics.http_req_failed.values.rate = lineData.data.value;
                  } else {
                    metrics.http_req_failed.rate = lineData.data.value;
                  }
                } else if (lineData.metric === 'vus_max') {
                  if (!metrics.vus_max) metrics.vus_max = { value: 0 };
                  metrics.vus_max.value = lineData.data.value;
                } else {
                  // For other custom metrics
                  if (!metrics[lineData.metric]) {
                    metrics[lineData.metric] = { values: {} };
                  }
                  const stat = lineData.data.tags?.statistic || 'count';
                  
                  if ('values' in metrics[lineData.metric]) {
                    metrics[lineData.metric].values[stat] = lineData.data.value;
                  } else {
                    metrics[lineData.metric][stat] = lineData.data.value;
                  }
                }
              }
            }
            
            // Look for summary data
            if (lineData.type === 'Group' && lineData.data) {
              rootGroup = lineData.data;
            }
          } catch (lineError) {
            console.warn(`Skipping invalid JSON line: ${lineError.message}`);
          }
        }
      }
      
      // Extract metrics
      const totalRequests = this.getValueFromMetric<number>(metrics.http_reqs, 'count') || 0;
      
      // Calculate the test duration
      // Previously: const duration = Math.round(avgDuration * iterationCount / 1000);
      // This formula multiplied all iterations by average duration, leading to incorrect total duration
      
      // Use the test runtime metric if available (in seconds)
      let duration = 0;
      if (metrics.test_runtime) {
        if ('values' in metrics.test_runtime && metrics.test_runtime.values) {
          duration = metrics.test_runtime.values.duration || 0;
        } else if ('duration' in metrics.test_runtime) {
          duration = metrics.test_runtime.duration || 0;
        } else {
          duration = metrics.test_runtime.avg || metrics.test_runtime.max || 0;
        }
      } 
      
      // If test_runtime is not available, use the test stages configuration
      if (duration === 0 && metrics.test_options && metrics.test_options.stages) {
        const stages = metrics.test_options.stages;
        // Sum up the duration of all stages
        duration = stages.reduce((total, stage) => {
          const stageDuration = parseFloat(stage.duration.replace('s', ''));
          return total + (isNaN(stageDuration) ? 0 : stageDuration);
        }, 0);
      }
      
      // Fallback: if no direct duration metric is found, estimate from iterations
      // but with a more conservative approach than before
      if (duration === 0) {
        // Safely extract the average duration based on the data structure
        let avgDuration = 0;
        if (metrics.iteration_duration) {
          if ('values' in metrics.iteration_duration && metrics.iteration_duration.values) {
            avgDuration = metrics.iteration_duration.values.avg || 0;
          } else if ('avg' in metrics.iteration_duration) {
            avgDuration = metrics.iteration_duration.avg || 0;
          }
        }
        
        const iterationCount = metrics.iterations?.count || 0;
        const requestRate = this.getValueFromMetric<number>(metrics.http_reqs, 'rate') || 0;
        
        // If we have a request rate, use that for a more accurate duration estimation
        if (requestRate > 0 && totalRequests > 0) {
          duration = Math.round(totalRequests / requestRate);
        } else if (avgDuration > 0 && iterationCount > 0) {
          // Last resort: use a more conservative estimate 
          // Assume some parallelism based on VUs instead of sequential execution
          const vus = metrics.vus_max?.value || 1;
          duration = Math.round((avgDuration * iterationCount) / (1000 * Math.max(1, vus)));
        }
      }
      
      const requestRate = this.getValueFromMetric<number>(metrics.http_reqs, 'rate') || 0;
      
      // Process thresholds
      const thresholdResults: ThresholdResult[] = [];
      
      if (rootGroup.groups) {
        for (const group of rootGroup.groups) {
          if (group.checks) {
            for (const check of group.checks) {
              thresholdResults.push({
                metric: check.name,
                threshold: check.threshold || '',
                value: check.value || '',
                passed: check.passes > 0 && check.fails === 0
              });
            }
          }
        }
      }
      
      // Process success rates and counts based on service type
      const successRates: SuccessRateMetrics = {};
      const operationCounts: Record<string, number> = {};
      
      // Common metrics processing code
      Object.keys(metrics).forEach(key => {
        // Handle new summary format success rates
        if (key.endsWith('_success_rate')) {
          const operationName = key.replace('_success_rate', '');
          const countKey = `${operationName}_count`;
          
          // Handle different formats of success rate metrics
          if (metrics[key]?.value !== undefined) {
            // Summary format
            successRates[operationName] = {
              rate: metrics[key].value || 0,
              count: metrics[countKey]?.count || 0
            };
            
            operationCounts[operationName] = metrics[countKey]?.count || 0;
          } else {
            // JSONL format
            successRates[operationName] = {
              rate: metrics[key]?.values?.rate || 0,
              count: metrics[countKey]?.values?.count || 0
            };
            
            operationCounts[operationName] = metrics[countKey]?.values?.count || 0;
          }
        }
      });
      
      // Create response time metrics
      const responseTimeMetrics: ResponseTimeMetrics = {};
      
      Object.keys(metrics).forEach(key => {
        if (key.endsWith('_duration') && !key.startsWith('http_req') && !key.startsWith('iteration')) {
          const operationName = key.replace('_duration', '');
          
          // Check if this is a summary format
          if (metrics[key]?.['p(95)'] !== undefined) {
            responseTimeMetrics[operationName] = {
              avg: this.formatTime(metrics[key].avg || 0),
              p95: this.formatTime(metrics[key]['p(95)'] || 0),
              p99: this.formatTime(metrics[key]['p(99)'] || 0)
            };
          } else {
            // JSONL format
            responseTimeMetrics[operationName] = {
              avg: this.formatTime(metrics[key]?.values?.avg || 0),
              p95: this.formatTime(metrics[key]?.values?.['p(95)'] || 0),
              p99: this.formatTime(metrics[key]?.values?.['p(99)'] || 0)
            };
          }
        }
      });
      
      // Add overall metrics
      if (metrics.http_req_duration && 'avg' in metrics.http_req_duration) {
        // Summary format
        responseTimeMetrics.overall = {
          avg: this.formatTime(metrics.http_req_duration.avg || 0),
          p95: this.formatTime(metrics.http_req_duration['p(95)'] || 0),
          p99: this.formatTime(metrics.http_req_duration['p(99)'] || 0)
        };
      } else {
        // JSONL format
        const httpDuration = metrics.http_req_duration || {};
        let avgValue = 0;
        let p95Value = 0;
        let p99Value = 0;
        
        if (httpDuration && 'values' in httpDuration && httpDuration.values) {
          // Type assertion to handle the 'unknown' type error
          const values = httpDuration.values as { avg: number; 'p(95)': number; 'p(99)'?: number };
          avgValue = values.avg || 0;
          p95Value = values['p(95)'] || 0;
          p99Value = values['p(99)'] || 0;
        }
        
        responseTimeMetrics.overall = {
          avg: this.formatTime(avgValue),
          p95: this.formatTime(p95Value),
          p99: this.formatTime(Number(p99Value) || 0)  // Ensure p99Value is a number
        };
      }
      
      // Test details
      const testDetails: TestDetails = {
        name: reportName,
        duration: this.formatDuration(duration),
        vus: metrics.vus_max?.value || 0,
        date: new Date().toISOString(),
        iterations: metrics.iterations?.count || 0,
        failRate: Number((() => {
          if (!metrics.http_req_failed) return 0;
          
          if ('values' in metrics.http_req_failed && metrics.http_req_failed.values) {
            return metrics.http_req_failed.values.rate || 0;
          }
          
          if ('value' in metrics.http_req_failed) {
            return metrics.http_req_failed.value || 0;
          }
          
          if ('rate' in metrics.http_req_failed) {
            return metrics.http_req_failed.rate || 0;
          }
          
          return 0;
        })())
      };
      
      // Generate HTML
      const html = this.generateHtml(
        testDetails,
        responseTimeMetrics,
        successRates,
        thresholdResults,
        operationCounts,
        requestRate,
        serviceName
      );
      
      // Create directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Save the HTML report
      fs.writeFileSync(outputPath, html);
      console.log(`Report generated successfully: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`Error generating report: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Generate the HTML report content
   */
  private static generateHtml(
    testDetails: TestDetails,
    responseTimeMetrics: ResponseTimeMetrics,
    successRates: SuccessRateMetrics,
    thresholds: ThresholdResult[],
    counts: Record<string, number>,
    requestRate: number,
    serviceName: string
  ): string {
    // Calculate overall status
    const overallPassed = thresholds.every(t => t.passed);
    
    // Format metrics for display
    const formattedSuccessRate = ((1 - testDetails.failRate) * 100).toFixed(2);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.capitalize(serviceName)} Service ${testDetails.name} Report</title>
    <style>
        :root {
            --primary-color: #4CAF50;
            --danger-color: #F44336;
            --warning-color: #FF9800;
            --info-color: #2196F3;
            --dark-color: #333;
            --light-color: #f9f9f9;
            --border-color: #ddd;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 5px;
        }
        
        header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
        }
        
        h1 {
            color: var(--dark-color);
            margin: 0;
            padding: 0;
        }
        
        .status-banner {
            text-align: center;
            padding: 15px;
            margin-bottom: 30px;
            font-size: 24px;
            font-weight: bold;
            border-radius: 5px;
            background-color: ${overallPassed ? 'var(--primary-color)' : 'var(--danger-color)'};
            color: white;
        }
        
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--light-color);
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        h2 {
            color: var(--dark-color);
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .metric-card {
            padding: 15px;
            background-color: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
        }
        
        .metric-card h3 {
            margin-top: 0;
            color: var(--dark-color);
            font-size: 16px;
        }
        
        .value {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .good {
            color: var(--primary-color);
        }
        
        .warning {
            color: var(--warning-color);
        }
        
        .danger {
            color: var(--danger-color);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            text-align: left;
            padding: 12px 15px;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background-color: var(--dark-color);
            color: white;
        }
        
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        
        .pass, .threshold-pass {
            color: var(--primary-color);
            font-weight: bold;
        }
        
        .fail, .threshold-fail {
            color: var(--danger-color);
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
            color: #777;
            font-size: 14px;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr 1fr;
            }
            
            table {
                font-size: 14px;
            }
        }
        
        @media (max-width: 480px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            th, td {
                padding: 8px 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${this.capitalize(serviceName)} Service ${testDetails.name}</h1>
            <p>Generated on ${new Date(testDetails.date).toLocaleDateString()} at ${new Date(testDetails.date).toLocaleTimeString()}</p>
        </header>
        
        <div class="status-banner">
            Test Status: ${overallPassed ? 'PASSED' : 'FAILED'}
        </div>
        
        <div class="section">
            <h2>Test Overview</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Total Requests</h3>
                    <div class="value">${this.formatNumber(Object.values(counts).reduce((sum, count) => sum + count, 0))}</div>
                    <p>${requestRate.toFixed(2)} req/s</p>
                </div>
                <div class="metric-card">
                    <h3>Success Rate</h3>
                    <div class="value ${this.getSuccessClass(parseFloat(formattedSuccessRate))}">${formattedSuccessRate}%</div>
                </div>
                <div class="metric-card">
                    <h3>Response Time</h3>
                    <div class="value ${this.getResponseTimeClass(parseFloat(responseTimeMetrics.overall.avg))}">${responseTimeMetrics.overall.avg}</div>
                    <p>p95: ${responseTimeMetrics.overall.p95}</p>
                </div>
                <div class="metric-card">
                    <h3>Virtual Users</h3>
                    <div class="value">${testDetails.vus}</div>
                </div>
                <div class="metric-card">
                    <h3>Test Duration</h3>
                    <div class="value">${testDetails.duration}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>Operation Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Operation</th>
                        <th>Count</th>
                        <th>Success Rate</th>
                        <th>Avg Response Time</th>
                        <th>P95 Response Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(successRates)
                      .filter(operation => operation !== 'overall')
                      .map(operation => {
                        const successRate = successRates[operation];
                        const responseTime = responseTimeMetrics[operation] || {avg: 'N/A', p95: 'N/A'};
                        return `
                            <tr>
                                <td>${this.formatMetricName(operation)}</td>
                                <td>${this.formatNumber(successRate?.count || 0)}</td>
                                <td class="${this.getSuccessClass((successRate?.rate || 0) * 100)}">${((successRate?.rate || 0) * 100).toFixed(2)}%</td>
                                <td>${responseTime.avg}</td>
                                <td>${responseTime.p95}</td>
                            </tr>
                        `;
                      }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Thresholds</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Threshold</th>
                        <th>Actual Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${thresholds.map(t => `
                        <tr>
                            <td>${this.formatMetricName(t.metric)}</td>
                            <td>${t.threshold}</td>
                            <td>${t.value}</td>
                            <td class="${t.passed ? 'threshold-pass' : 'threshold-fail'}">${t.passed ? 'PASS' : 'FAIL'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Test executed on ${new Date(testDetails.date).toLocaleDateString()} at ${new Date(testDetails.date).toLocaleTimeString()}</p>
            <p>${this.capitalize(serviceName)} Service Load Test Report</p>
        </div>
    </div>
</body>
</html>`;
  }
  
  /**
   * Format a metric name for display
   */
  private static formatMetricName(name: string): string {
    if (!name) return 'Unknown';
    
    // Remove common prefixes and suffixes
    let formattedName = name.replace(/_duration$/, '')
                            .replace(/_count$/, '')
                            .replace(/_success_rate$/, '')
                            .replace(/_success$/, '');
    
    // Convert snake_case to Title Case with spaces
    formattedName = formattedName.split('_')
                                .map(word => this.capitalize(word))
                                .join(' ');
    
    return formattedName;
  }
  
  /**
   * Format time in milliseconds to a human-readable string
   */
  private static formatTime(ms: number): string {
    if (ms < 0.1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds.toFixed(0)}s`;
  }
  
  /**
   * Format duration in seconds to a human-readable string
   */
  private static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
  }
  
  /**
   * Get a CSS class based on success rate
   */
  private static getSuccessClass(rate: number): string {
    if (rate >= 95) return 'good';
    if (rate >= 90) return 'warning';
    return 'danger';
  }
  
  /**
   * Get a CSS class based on response time
   */
  private static getResponseTimeClass(avgTime: number): string {
    if (avgTime < 100) return 'good';
    if (avgTime < 300) return 'warning';
    return 'danger';
  }
  
  /**
   * Capitalize the first letter of a string
   */
  private static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Format a number with thousands separators
   */
  private static formatNumber(num: number): string {
    return num.toLocaleString();
  }
  
  /**
   * Get value from metrics that could have different structure formats
   */
  private static getValueFromMetric<T>(metric: any, property: string, subProperty?: string): T | undefined {
    if (!metric) {
      return undefined;
    }
    
    // Handle the case where the property is directly on the metric
    if (property in metric) {
      return subProperty ? undefined : metric[property];
    }
    
    // Handle the case where the property is in the 'values' object
    if ('values' in metric && metric.values && property in metric.values) {
      return metric.values[property];
    }
    
    // Handle the case where we need to get a sub-property
    if (subProperty && property in metric && subProperty in metric[property]) {
      return metric[property][subProperty];
    }
    
    return undefined;
  }
} 