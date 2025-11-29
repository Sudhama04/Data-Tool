// Configuration
const API_BASE = 'http://localhost:5000';
let currentDataset = null;
let currentChart = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    checkServerStatus();
}

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
            console.log('✅ Backend server is running');
        }
    } catch (error) {
        console.error('❌ Backend server is not reachable');
        showError('Backend server is not running. Please start the Flask server on port 5000.');
    }
}

function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFileUpload);
    
    // Module cards click events
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', function() {
            const moduleType = this.classList[1]; // clustering, outliers, etc.
            handleModuleClick(moduleType);
        });
    });
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar ul li').forEach((item, index) => {
        item.addEventListener('click', function() {
            // Remove active class from all
            document.querySelectorAll('.sidebar ul li').forEach(li => {
                li.classList.remove('active');
            });
            // Add active to clicked
            this.classList.add('active');
            
            const sections = ['dashboard', 'upload', 'clustering', 'outliers', 'visualization', 'regression', 'apriori'];
            handleSidebarNavigation(sections[index]);
        });
    });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showLoading('Uploading file...');
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentDataset = result;
            showSuccess('File uploaded successfully!');
            updateDatasetInfo();
            updateUIAfterUpload();
        } else {
            showError(`Upload failed: ${result.error}`);
        }
    } catch (error) {
        showError(`Upload error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function handleModuleClick(moduleType) {
    if (!currentDataset) {
        showError('Please upload a dataset first!');
        return;
    }
    
    switch(moduleType) {
        case 'clustering':
            openClusteringInterface();
            break;
        case 'outliers':
            openOutliersInterface();
            break;
        case 'visualization':
            openVisualizationInterface();
            break;
        case 'regression':
            openRegressionInterface();
            break;
        case 'apriori':
            openAprioriInterface();
            break;
        default:
            showModal(`<div class="modal"><div class="modal-content"><h2>${moduleType.charAt(0).toUpperCase() + moduleType.slice(1)}</h2><p>This feature is coming soon!</p></div></div>`);
    }
}

function handleSidebarNavigation(section) {
    switch(section) {
        case 'dashboard':
            // Already on dashboard
            break;
        case 'upload':
            document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'clustering':
            openClusteringInterface();
            break;
        case 'outliers':
            openOutliersInterface();
            break;
        case 'visualization':
            openVisualizationInterface();
            break;
        case 'regression':
            openRegressionInterface();
            break;
        case 'apriori':
            openAprioriInterface();
            break;
    }
}

// Clustering Functions
function openClusteringInterface() {
    const modalContent = `
        <div class="modal">
            <div class="modal-header">
                <h2><i class="fas fa-object-group"></i> Clustering Analysis</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="form-group">
                    <label for="clustering-algorithm">Algorithm:</label>
                    <select id="clustering-algorithm" class="form-control">
                        <option value="kmeans">K-Means Clustering</option>
                        <option value="dbscan">DBSCAN Clustering</option>
                    </select>
                </div>
                
                <div class="form-group" id="kmeans-params">
                    <label for="n-clusters">Number of Clusters:</label>
                    <input type="number" id="n-clusters" class="form-control" value="3" min="2" max="10">
                </div>
                
                <div class="form-group" id="dbscan-params" style="display:none">
                    <label for="eps-value">Epsilon (eps):</label>
                    <input type="number" id="eps-value" class="form-control" value="0.5" step="0.1" min="0.1">
                    
                    <label for="min-samples">Minimum Samples:</label>
                    <input type="number" id="min-samples" class="form-control" value="5" min="1">
                </div>
                
                <button class="btn-primary" onclick="runClustering()">
                    <i class="fas fa-play"></i> Run Clustering Analysis
                </button>
                
                <div id="clustering-results" class="results-section"></div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // Add event listener for algorithm change
    document.getElementById('clustering-algorithm').addEventListener('change', function() {
        const algorithm = this.value;
        document.getElementById('kmeans-params').style.display = algorithm === 'kmeans' ? 'block' : 'none';
        document.getElementById('dbscan-params').style.display = algorithm === 'dbscan' ? 'block' : 'none';
    });
    
    // Close modal event
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.querySelector('.modal-overlay').remove();
    });
}

async function runClustering() {
    const algorithm = document.getElementById('clustering-algorithm').value;
    const params = { algorithm };
    
    if (algorithm === 'kmeans') {
        params.n_clusters = parseInt(document.getElementById('n-clusters').value);
    } else if (algorithm === 'dbscan') {
        params.eps = parseFloat(document.getElementById('eps-value').value);
        params.min_samples = parseInt(document.getElementById('min-samples').value);
    }
    
    try {
        showLoading('Running clustering analysis...');
        
        const response = await fetch(`${API_BASE}/clustering`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayClusteringResults(result);
        } else {
            showError(`Clustering failed: ${result.error}`);
        }
    } catch (error) {
        showError(`Clustering error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayClusteringResults(result) {
    const resultsDiv = document.getElementById('clustering-results');
    
    let clustersHTML = '<h3><i class="fas fa-chart-pie"></i> Clustering Results</h3>';
    clustersHTML += '<div class="result-grid">';
    
    // Cluster sizes
    clustersHTML += '<div class="result-card">';
    clustersHTML += '<h4>Cluster Distribution</h4>';
    clustersHTML += '<table class="result-table">';
    clustersHTML += '<tr><th>Cluster</th><th>Size</th><th>Percentage</th></tr>';
    
    const totalSamples = Object.values(result.cluster_sizes).reduce((a, b) => a + b, 0);
    
    Object.entries(result.cluster_sizes).forEach(([cluster, size]) => {
        const percentage = ((size / totalSamples) * 100).toFixed(1);
        clustersHTML += `<tr>
            <td>${cluster === '-1' ? 'Noise' : `Cluster ${cluster}`}</td>
            <td>${size}</td>
            <td>${percentage}%</td>
        </tr>`;
    });
    
    clustersHTML += '</table></div>';
    
    // Cluster centers if available
    if (result.centers && result.centers.length > 0) {
        clustersHTML += '<div class="result-card">';
        clustersHTML += '<h4>Cluster Centers</h4>';
        clustersHTML += '<table class="result-table">';
        clustersHTML += '<tr><th>Cluster</th>';
        
        result.features_used.forEach(feature => {
            clustersHTML += `<th>${feature}</th>`;
        });
        
        clustersHTML += '</tr>';
        
        result.centers.forEach((center, index) => {
            clustersHTML += `<tr><td><strong>Cluster ${index}</strong></td>`;
            center.forEach(value => {
                clustersHTML += `<td>${value.toFixed(2)}</td>`;
            });
            clustersHTML += '</tr>';
        });
        
        clustersHTML += '</table></div>';
    }
    
    // Features used
    clustersHTML += '<div class="result-card">';
    clustersHTML += '<h4>Analysis Details</h4>';
    clustersHTML += `<p><strong>Algorithm:</strong> ${result.algorithm.toUpperCase()}</p>`;
    clustersHTML += `<p><strong>Features Used:</strong> ${result.features_used.join(', ')}</p>`;
    clustersHTML += `<p><strong>Total Samples:</strong> ${totalSamples}</p>`;
    clustersHTML += '</div>';
    
    clustersHTML += '</div>';
    resultsDiv.innerHTML = clustersHTML;
}

// Outlier Detection Functions
function openOutliersInterface() {
    const modalContent = `
        <div class="modal">
            <div class="modal-header">
                <h2><i class="fas fa-exclamation-triangle"></i> Outlier Detection</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="form-group">
                    <label for="outlier-method">Detection Method:</label>
                    <select id="outlier-method" class="form-control">
                        <option value="zscore">Z-Score Method</option>
                        <option value="iqr">IQR (Interquartile Range)</option>
                        <option value="isolation">Isolation Forest</option>
                    </select>
                </div>
                
                <button class="btn-primary" onclick="runOutlierDetection()">
                    <i class="fas fa-search"></i> Detect Outliers
                </button>
                
                <div id="outlier-results" class="results-section"></div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // Close modal event
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.querySelector('.modal-overlay').remove();
    });
}

async function runOutlierDetection() {
    const method = document.getElementById('outlier-method').value;
    
    try {
        showLoading('Detecting outliers...');
        
        const response = await fetch(`${API_BASE}/outliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayOutlierResults(result);
        } else {
            showError(`Outlier detection failed: ${result.error}`);
        }
    } catch (error) {
        showError(`Outlier detection error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayOutlierResults(result) {
    const resultsDiv = document.getElementById('outlier-results');
    
    let outliersHTML = '<h3><i class="fas fa-chart-bar"></i> Outlier Detection Results</h3>';
    
    // Summary card
    outliersHTML += '<div class="result-grid">';
    outliersHTML += '<div class="result-card">';
    outliersHTML += '<h4>Detection Summary</h4>';
    outliersHTML += `<p><strong>Method:</strong> ${result.method.toUpperCase()}</p>`;
    outliersHTML += `<p><strong>Total Samples:</strong> ${result.total_samples}</p>`;
    outliersHTML += `<p><strong>Outliers Found:</strong> <span style="color: var(--danger);">${result.outlier_count}</span></p>`;
    outliersHTML += `<p><strong>Outlier Percentage:</strong> ${((result.outlier_count / result.total_samples) * 100).toFixed(2)}%</p>`;
    outliersHTML += '</div>';
    
    if (result.outlier_data && result.outlier_data.length > 0) {
        outliersHTML += '<div class="result-card" style="grid-column: span 2;">';
        outliersHTML += '<h4>Detected Outliers</h4>';
        outliersHTML += '<div class="results-table-container">';
        outliersHTML += '<table class="result-table">';
        outliersHTML += '<tr><th>Row Index</th>';
        
        // Get column names from first outlier
        Object.keys(result.outlier_data[0]).forEach(col => {
            outliersHTML += `<th>${col}</th>`;
        });
        
        outliersHTML += '</tr>';
        
        result.outlier_data.slice(0, 10).forEach((row, index) => {
            outliersHTML += `<tr><td><strong>${result.outlier_indices[index]}</strong></td>`;
            Object.values(row).forEach(value => {
                const numValue = parseFloat(value);
                outliersHTML += `<td>${!isNaN(numValue) ? numValue.toFixed(2) : value}</td>`;
            });
            outliersHTML += '</tr>';
        });
        
        outliersHTML += '</table>';
        outliersHTML += '<p style="margin-top: 10px; font-size: 12px; color: var(--gray);">Showing first 10 outliers</p>';
        outliersHTML += '</div></div>';
    }
    
    outliersHTML += '</div>';
    resultsDiv.innerHTML = outliersHTML;
}

// Regression Functions
function openRegressionInterface() {
    if (!currentDataset) {
        showError('Please upload a dataset first!');
        return;
    }
    
    const numericColumns = Object.entries(currentDataset.dtypes)
        .filter(([col, dtype]) => dtype === 'float64' || dtype === 'int64')
        .map(([col]) => col);
    
    if (numericColumns.length < 2) {
        showError('Need at least 2 numeric columns for regression analysis');
        return;
    }
    
    const modalContent = `
        <div class="modal">
            <div class="modal-header">
                <h2><i class="fas fa-trend-up"></i> Regression Analysis</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="form-group">
                    <label for="target-variable">Target Variable (Y):</label>
                    <select id="target-variable" class="form-control">
                        ${numericColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Feature Variables (X):</label>
                    <div class="features-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px;">
                        ${numericColumns.map(col => `
                            <label class="checkbox-label" style="display: block; margin: 8px 0;">
                                <input type="checkbox" name="features" value="${col}" ${col !== numericColumns[0] ? 'checked' : ''}>
                                ${col}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <button class="btn-primary" onclick="runRegression()">
                    <i class="fas fa-calculator"></i> Run Regression Analysis
                </button>
                
                <div id="regression-results" class="results-section"></div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // Close modal event
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.querySelector('.modal-overlay').remove();
    });
}

async function runRegression() {
    const target = document.getElementById('target-variable').value;
    const featureCheckboxes = document.querySelectorAll('input[name="features"]:checked');
    const features = Array.from(featureCheckboxes).map(cb => cb.value);
    
    // Remove target from features if selected
    const filteredFeatures = features.filter(f => f !== target);
    
    if (filteredFeatures.length === 0) {
        showError('Please select at least one feature (different from target)');
        return;
    }
    
    try {
        showLoading('Running regression analysis...');
        
        const response = await fetch(`${API_BASE}/regression`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target: target,
                features: filteredFeatures
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayRegressionResults(result);
        } else {
            showError(`Regression failed: ${result.error}`);
        }
    } catch (error) {
        showError(`Regression error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayRegressionResults(result) {
    const resultsDiv = document.getElementById('regression-results');
    
    let regressionHTML = '<h3><i class="fas fa-chart-line"></i> Regression Results</h3>';
    regressionHTML += '<div class="result-grid">';
    
    // Model metrics
    regressionHTML += '<div class="result-card">';
    regressionHTML += '<h4>Model Performance</h4>';
    regressionHTML += '<table class="result-table">';
    regressionHTML += `<tr><td><strong>R-squared</strong></td><td style="color: var(--primary); font-weight: 600;">${result.r_squared.toFixed(4)}</td></tr>`;
    regressionHTML += `<tr><td><strong>Mean Squared Error</strong></td><td>${result.mse.toFixed(4)}</td></tr>`;
    regressionHTML += `<tr><td><strong>Intercept</strong></td><td>${result.intercept.toFixed(4)}</td></tr>`;
    regressionHTML += '</table>';
    regressionHTML += '<div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 6px;">';
    regressionHTML += `<small><strong>Interpretation:</strong> The model explains ${(result.r_squared * 100).toFixed(2)}% of the variance in ${result.target}</small>`;
    regressionHTML += '</div>';
    regressionHTML += '</div>';
    
    // Coefficients
    regressionHTML += '<div class="result-card">';
    regressionHTML += '<h4>Feature Coefficients</h4>';
    regressionHTML += '<table class="result-table">';
    regressionHTML += '<tr><th>Feature</th><th>Coefficient</th><th>Impact</th></tr>';
    
    Object.entries(result.coefficients).forEach(([feature, coef]) => {
        const impact = coef > 0 ? 'Positive' : 'Negative';
        const color = coef > 0 ? 'var(--success)' : 'var(--danger)';
        regressionHTML += `<tr>
            <td>${feature}</td>
            <td>${coef.toFixed(4)}</td>
            <td style="color: ${color}; font-weight: 500;">${impact}</td>
        </tr>`;
    });
    
    regressionHTML += '</table>';
    regressionHTML += '</div>';
    
    // Model equation
    regressionHTML += '<div class="result-card" style="grid-column: span 2;">';
    regressionHTML += '<h4>Regression Equation</h4>';
    regressionHTML += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-family: monospace;">';
    regressionHTML += `<strong>${result.target} = ${result.intercept.toFixed(4)}</strong>`;
    Object.entries(result.coefficients).forEach(([feature, coef]) => {
        const sign = coef >= 0 ? ' + ' : ' - ';
        regressionHTML += `${sign} ${Math.abs(coef).toFixed(4)} × ${feature}`;
    });
    regressionHTML += '</div>';
    regressionHTML += '</div>';
    
    regressionHTML += '</div>';
    resultsDiv.innerHTML = regressionHTML;
}

// Dynamic Visualization Functions with Chart.js
function openVisualizationInterface() {
    if (!currentDataset) {
        showError('Please upload a dataset first!');
        return;
    }
    
    const numericColumns = Object.entries(currentDataset.dtypes)
        .filter(([col, dtype]) => dtype === 'float64' || dtype === 'int64')
        .map(([col]) => col);
    
    const categoricalColumns = Object.entries(currentDataset.dtypes)
        .filter(([col, dtype]) => dtype !== 'float64' && dtype !== 'int64')
        .map(([col]) => col);
    
    const modalContent = `
        <div class="modal" style="max-width: 95%;">
            <div class="modal-header">
                <h2><i class="fas fa-chart-bar"></i> Interactive Data Visualization</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="form-group">
                    <label for="chart-type">Chart Type:</label>
                    <select id="chart-type" class="form-control">
                        <option value="scatter">Scatter Plot</option>
                        <option value="line">Line Chart</option>
                        <option value="bar">Bar Chart</option>
                        <option value="histogram">Histogram</option>
                        <option value="pie">Pie Chart</option>
                        <option value="doughnut">Doughnut Chart</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="x-axis">X-Axis Variable:</label>
                    <select id="x-axis" class="form-control">
                        ${numericColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        ${categoricalColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="y-axis">Y-Axis Variable:</label>
                    <select id="y-axis" class="form-control">
                        <option value="count">Count (for categorical)</option>
                        ${numericColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                    </select>
                </div>
                
                ${categoricalColumns.length > 0 ? `
                <div class="form-group">
                    <label for="category-axis">Category/Color By:</label>
                    <select id="category-axis" class="form-control">
                        <option value="none">None</option>
                        ${categoricalColumns.map(col => `<option value="${col}">${col}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
                
                <button class="btn-primary" onclick="generateDynamicVisualization()">
                    <i class="fas fa-chart-line"></i> Generate Interactive Chart
                </button>
                
                <div id="visualization-results" class="results-section">
                    <div style="text-align: center; padding: 20px; color: var(--gray);">
                        <i class="fas fa-chart-area" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Select chart type and variables to generate interactive visualization</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // Close modal event
    document.querySelector('.close-modal').addEventListener('click', function() {
        if (currentChart) {
            currentChart.destroy();
        }
        document.querySelector('.modal-overlay').remove();
    });
}

function generateDynamicVisualization() {
    const chartType = document.getElementById('chart-type').value;
    const xAxis = document.getElementById('x-axis').value;
    const yAxis = document.getElementById('y-axis').value;
    const categoryAxis = document.getElementById('category-axis') ? document.getElementById('category-axis').value : 'none';
    
    const resultsDiv = document.getElementById('visualization-results');
    
    // Clear previous chart
    if (currentChart) {
        currentChart.destroy();
    }
    
    resultsDiv.innerHTML = `
        <h3><i class="fas fa-chart-${getChartIcon(chartType)}"></i> ${getChartName(chartType)}</h3>
        <div class="result-card">
            <h4>${xAxis} ${yAxis !== 'count' ? 'vs ' + yAxis : 'Distribution'}</h4>
            <div style="position: relative; height: 500px; margin: 20px 0;">
                <canvas id="dynamicChart"></canvas>
            </div>
            <div style="margin-top: 15px;">
                <p><strong>Chart Type:</strong> ${getChartName(chartType)}</p>
                <p><strong>X-Axis:</strong> ${xAxis}</p>
                ${yAxis !== 'count' ? `<p><strong>Y-Axis:</strong> ${yAxis}</p>` : ''}
                ${categoryAxis !== 'none' ? `<p><strong>Category:</strong> ${categoryAxis}</p>` : ''}
            </div>
        </div>
    `;
    
    // Generate dynamic chart based on actual data
    generateDynamicChart(chartType, xAxis, yAxis, categoryAxis);
}

function generateDynamicChart(chartType, xAxis, yAxis, categoryAxis) {
    const ctx = document.getElementById('dynamicChart').getContext('2d');
    
    // Get actual data from currentDataset
    const chartData = prepareChartData(chartType, xAxis, yAxis, categoryAxis);
    
    const chartConfig = {
        type: getChartJSType(chartType),
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${xAxis} ${yAxis !== 'count' ? 'vs ' + yAxis : 'Distribution'}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: chartType === 'scatter' ? 'point' : 'index',
                    intersect: false,
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: xAxis
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: yAxis !== 'count' ? yAxis : 'Count'
                    }
                }
            },
            elements: {
                point: {
                    radius: chartType === 'scatter' ? 5 : 3,
                    hoverRadius: 8
                }
            }
        }
    };
    
    currentChart = new Chart(ctx, chartConfig);
}

function prepareChartData(chartType, xAxis, yAxis, categoryAxis) {
    const colors = ['#4361ee', '#3a0ca3', '#4cc9f0', '#f72585', '#f8961e', '#7209b7', '#3a86ff', '#ff6b6b', '#06d6a0', '#118ab2'];
    
    // Extract actual data from currentDataset preview
    const data = currentDataset.preview;
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        // Count frequencies for categorical data
        const counts = {};
        data.forEach(row => {
            const value = row[xAxis];
            counts[value] = (counts[value] || 0) + 1;
        });
        
        return {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: colors,
                borderWidth: 2
            }]
        };
    }
    
    if (categoryAxis !== 'none') {
        // Group data by category
        const categories = [...new Set(data.map(row => row[categoryAxis]))];
        const xValues = [...new Set(data.map(row => row[xAxis]))];
        
        const datasets = categories.map((category, index) => {
            const categoryData = data.filter(row => row[categoryAxis] === category);
            const values = xValues.map(x => {
                const matchingRow = categoryData.find(row => row[xAxis] === x);
                return matchingRow ? (yAxis === 'count' ? 1 : parseFloat(matchingRow[yAxis]) || 0) : 0;
            });
            
            return {
                label: category,
                data: values,
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length],
                borderWidth: 2,
                fill: chartType === 'line'
            };
        });
        
        return {
            labels: xValues,
            datasets: datasets
        };
    }
    
    // Single dataset
    if (yAxis === 'count') {
        // Count chart
        const counts = {};
        data.forEach(row => {
            const value = row[xAxis];
            counts[value] = (counts[value] || 0) + 1;
        });
        
        return {
            labels: Object.keys(counts),
            datasets: [{
                label: `Count of ${xAxis}`,
                data: Object.values(counts),
                backgroundColor: colors[0],
                borderColor: colors[0],
                borderWidth: 2
            }]
        };
    } else {
        // Numerical chart
        const labels = data.map(row => row[xAxis]);
        const values = data.map(row => parseFloat(row[yAxis]) || 0);
        
        return {
            labels: labels,
            datasets: [{
                label: yAxis,
                data: values,
                backgroundColor: chartType === 'bar' ? colors[0] : 'transparent',
                borderColor: colors[0],
                borderWidth: 2,
                pointBackgroundColor: colors[0],
                fill: chartType === 'line'
            }]
        };
    }
}

function getChartJSType(chartType) {
    const typeMap = {
        scatter: 'scatter',
        line: 'line',
        bar: 'bar',
        histogram: 'bar',
        pie: 'pie',
        doughnut: 'doughnut'
    };
    return typeMap[chartType] || 'bar';
}

function getChartIcon(type) {
    const icons = {
        scatter: 'dot-circle',
        line: 'line',
        bar: 'bar-chart',
        histogram: 'chart-bar',
        pie: 'chart-pie',
        doughnut: 'chart-pie'
    };
    return icons[type] || 'chart-bar';
}

function getChartName(type) {
    const names = {
        scatter: 'Scatter Plot',
        line: 'Line Chart',
        bar: 'Bar Chart',
        histogram: 'Histogram',
        pie: 'Pie Chart',
        doughnut: 'Doughnut Chart'
    };
    return names[type] || 'Chart';
}

// Dynamic Apriori Algorithm Functions
function openAprioriInterface() {
    if (!currentDataset) {
        showError('Please upload a dataset first!');
        return;
    }
    
    const categoricalColumns = Object.entries(currentDataset.dtypes)
        .filter(([col, dtype]) => dtype !== 'float64' && dtype !== 'int64')
        .map(([col]) => col);
    
    if (categoricalColumns.length === 0) {
        showError('No categorical columns found for Apriori algorithm. Please upload a dataset with categorical data.');
        return;
    }
    
    const modalContent = `
        <div class="modal" style="max-width: 1200px;">
            <div class="modal-header">
                <h2><i class="fas fa-sitemap"></i> Apriori Algorithm - Dynamic Association Rules</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4><i class="fas fa-info-circle"></i> About Apriori Algorithm</h4>
                    <p style="margin: 5px 0; font-size: 14px;">Discover association rules between categorical variables in your dataset. The algorithm finds patterns like "If A and B are present, then C is also likely to be present."</p>
                </div>
                
                <div class="result-grid">
                    <div class="result-card">
                        <h4><i class="fas fa-columns"></i> Available Categorical Columns</h4>
                        <p style="font-size: 14px; color: var(--gray); margin-bottom: 15px;">Select columns to analyze for association rules:</p>
                        <div class="features-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; padding: 15px; border-radius: 8px;">
                            ${categoricalColumns.map(col => `
                                <label class="checkbox-label" style="display: block; margin: 8px 0;">
                                    <input type="checkbox" name="apriori-columns" value="${col}" checked>
                                    ${col}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="result-card">
                        <h4><i class="fas fa-sliders-h"></i> Algorithm Parameters</h4>
                        <div class="form-group">
                            <label for="min-support">Minimum Support (0.01 - 1.0):</label>
                            <input type="number" id="min-support" class="form-control" value="0.1" step="0.01" min="0.01" max="1.0">
                            <small style="color: var(--gray);">Minimum frequency of itemset in the dataset</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="min-confidence">Minimum Confidence (0.1 - 1.0):</label>
                            <input type="number" id="min-confidence" class="form-control" value="0.5" step="0.05" min="0.1" max="1.0">
                            <small style="color: var(--gray);">Minimum probability of consequent given antecedent</small>
                        </div>
                    </div>
                </div>
                
                <button class="btn-primary" onclick="runDynamicApriori()" style="margin: 20px 0;">
                    <i class="fas fa-project-diagram"></i> Find Association Rules
                </button>
                
                <div id="apriori-results" class="results-section">
                    <div style="text-align: center; padding: 40px; color: var(--gray);">
                        <i class="fas fa-sitemap" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>Configure parameters and run the Apriori algorithm to discover association rules from your data</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
    
    // Close modal event
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.querySelector('.modal-overlay').remove();
    });
}

async function runDynamicApriori() {
    const columnCheckboxes = document.querySelectorAll('input[name="apriori-columns"]:checked');
    const columns = Array.from(columnCheckboxes).map(cb => cb.value);
    const minSupport = parseFloat(document.getElementById('min-support').value);
    const minConfidence = parseFloat(document.getElementById('min-confidence').value);
    
    if (columns.length === 0) {
        showError('Please select at least one categorical column');
        return;
    }
    
    if (minSupport < 0.01 || minSupport > 1.0) {
        showError('Minimum support must be between 0.01 and 1.0');
        return;
    }
    
    if (minConfidence < 0.1 || minConfidence > 1.0) {
        showError('Minimum confidence must be between 0.1 and 1.0');
        return;
    }
    
    try {
        showLoading('Running Apriori algorithm on your data...');
        
        const response = await fetch(`${API_BASE}/apriori`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                columns: columns, 
                min_support: minSupport, 
                min_confidence: minConfidence 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayDynamicAprioriResults(result);
        } else {
            showError(`Apriori algorithm failed: ${result.error}`);
        }
    } catch (error) {
        showError(`Apriori algorithm error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function displayDynamicAprioriResults(result) {
    const resultsDiv = document.getElementById('apriori-results');
    
    let aprioriHTML = '<h3><i class="fas fa-project-diagram"></i> Association Rules Found</h3>';
    
    // Summary
    aprioriHTML += `
        <div class="result-grid">
            <div class="result-card">
                <h4><i class="fas fa-info-circle"></i> Analysis Summary</h4>
                <p><strong>Total Transactions:</strong> ${result.total_transactions}</p>
                <p><strong>Columns Analyzed:</strong> ${result.parameters.columns_used.join(', ')}</p>
                <p><strong>Minimum Support:</strong> ${result.parameters.min_support}</p>
                <p><strong>Minimum Confidence:</strong> ${result.parameters.min_confidence}</p>
                <p><strong>Rules Found:</strong> ${result.association_rules.length}</p>
                <p><strong>Frequent Itemsets:</strong> ${result.frequent_itemsets.length}</p>
            </div>
        </div>
    `;
    
    // Association Rules
    if (result.association_rules && result.association_rules.length > 0) {
        aprioriHTML += '<div class="result-card" style="margin-top: 20px;">';
        aprioriHTML += '<h4><i class="fas fa-link"></i> Top Association Rules</h4>';
        aprioriHTML += '<div class="results-table-container">';
        aprioriHTML += '<table class="result-table">';
        aprioriHTML += '<tr><th>Rule</th><th>Support</th><th>Confidence</th><th>Lift</th></tr>';
        
        result.association_rules.forEach(rule => {
            const ruleText = `IF ${rule.antecedents.join(' AND ')} THEN ${rule.consequents.join(' AND ')}`;
            aprioriHTML += `
                <tr>
                    <td><strong>${ruleText}</strong></td>
                    <td>${(rule.support * 100).toFixed(1)}%</td>
                    <td>${(rule.confidence * 100).toFixed(1)}%</td>
                    <td>${rule.lift.toFixed(2)}</td>
                </tr>
            `;
        });
        
        aprioriHTML += '</table>';
        aprioriHTML += '</div></div>';
    } else {
        aprioriHTML += '<div class="result-card" style="margin-top: 20px; text-align: center; padding: 40px;">';
        aprioriHTML += '<i class="fas fa-search" style="font-size: 48px; color: var(--gray); margin-bottom: 15px;"></i>';
        aprioriHTML += '<p>No association rules found with the current parameters. Try lowering the minimum support or confidence.</p>';
        aprioriHTML += '</div>';
    }
    
    // Frequent Itemsets
    if (result.frequent_itemsets && result.frequent_itemsets.length > 0) {
        aprioriHTML += '<div class="result-card" style="margin-top: 20px;">';
        aprioriHTML += '<h4><i class="fas fa-cubes"></i> Frequent Itemsets</h4>';
        aprioriHTML += '<div class="results-table-container">';
        aprioriHTML += '<table class="result-table">';
        aprioriHTML += '<tr><th>Itemset</th><th>Support</th><th>Size</th></tr>';
        
        result.frequent_itemsets.forEach(itemset => {
            aprioriHTML += `
                <tr>
                    <td><strong>${itemset.items.join(', ')}</strong></td>
                    <td>${(itemset.support * 100).toFixed(1)}%</td>
                    <td>${itemset.size}</td>
                </tr>
            `;
        });
        
        aprioriHTML += '</table>';
        aprioriHTML += '</div></div>';
    }
    
    resultsDiv.innerHTML = aprioriHTML;
}

// UI Helper Functions
function showModal(content) {
    // Remove existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = content;
    document.body.appendChild(modalOverlay);
    
    // Close modal when clicking outside
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            if (currentChart) {
                currentChart.destroy();
            }
            modalOverlay.remove();
        }
    });
}

function showLoading(message) {
    // Simple loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        z-index: 1001;
        font-weight: 500;
    `;
    loadingDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1001;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--danger);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1001;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function updateDatasetInfo() {
    if (!currentDataset) return;
    
    const datasetInfoDiv = document.querySelector('.dataset-info');
    if (datasetInfoDiv) {
        datasetInfoDiv.innerHTML = `
            <h4>Current Dataset: ${currentDataset.filename}</h4>
            <div class="dataset-stats">
                <div class="stat-card">
                    <div class="number">${currentDataset.shape[0]}</div>
                    <div class="label">ROWS</div>
                </div>
                <div class="stat-card">
                    <div class="number">${currentDataset.shape[1]}</div>
                    <div class="label">COLUMNS</div>
                </div>
                <div class="stat-card">
                    <div class="number">${Object.keys(currentDataset.dtypes).length}</div>
                    <div class="label">VARIABLES</div>
                </div>
                <div class="stat-card">
                    <div class="number">100%</div>
                    <div class="label">READY</div>
                </div>
            </div>
            <div style="margin-top: 15px; font-size: 14px;">
                <strong>Columns:</strong> ${currentDataset.columns.slice(0, 5).join(', ')}${currentDataset.columns.length > 5 ? '...' : ''}
            </div>
        `;
    }
}

function updateUIAfterUpload() {
    // Enable visual feedback for modules
    document.querySelectorAll('.module-card').forEach(card => {
        card.style.opacity = '1';
        card.style.cursor = 'pointer';
        card.style.transform = 'scale(1)';
    });
    
    // Show success message in upload section
    const uploadBox = document.querySelector('.upload-box');
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        background: #d4edda;
        color: #155724;
        border-radius: 6px;
        border: 1px solid #c3e6cb;
    `;
    successMsg.innerHTML = '<i class="fas fa-check"></i> Dataset loaded successfully! Click any module to start analysis.';
    uploadBox.appendChild(successMsg);
}