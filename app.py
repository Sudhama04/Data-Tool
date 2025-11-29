from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Enable CORS manually
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# Global variable to store the dataset
current_dataset = None

@app.route('/')
def home():
    return jsonify({"message": "Data Science Dashboard API is running!"})

@app.route('/upload', methods=['POST'])
def upload_file():
    global current_dataset
    
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file based on extension
        file_extension = file.filename.lower()
        
        if file_extension.endswith('.csv'):
            df = pd.read_csv(file)
        elif file_extension.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif file_extension.endswith('.json'):
            df = pd.read_json(file)
        else:
            return jsonify({'error': 'Unsupported file format. Use CSV, Excel, or JSON.'}), 400
        
        # Store dataset globally
        current_dataset = df
        
        # Get dataset info
        dataset_info = {
            'message': 'File uploaded successfully',
            'filename': file.filename,
            'shape': df.shape,
            'columns': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'preview': df.head(5).to_dict('records')
        }
        
        return jsonify(dataset_info)
    
    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

@app.route('/dataset/info', methods=['GET'])
def get_dataset_info():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset uploaded'}), 400
    
    return jsonify({
        'shape': current_dataset.shape,
        'columns': current_dataset.columns.tolist(),
        'dtypes': current_dataset.dtypes.ast(str).to_dict(),
        'preview': current_dataset.head(5).to_dict('records')
    })

@app.route('/clustering', methods=['POST'])
def perform_clustering():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset uploaded'}), 400
    
    try:
        data = request.get_json()
        algorithm = data.get('algorithm', 'kmeans')
        n_clusters = data.get('n_clusters', 3)
        
        # Select numeric columns only
        numeric_cols = current_dataset.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) < 2:
            return jsonify({'error': 'Need at least 2 numeric columns for clustering'}), 400
        
        X = current_dataset[numeric_cols].dropna()
        
        if algorithm == 'kmeans':
            model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = model.fit_predict(X)
            centers = model.cluster_centers_.tolist()
            
        elif algorithm == 'dbscan':
            eps = data.get('eps', 0.5)
            min_samples = data.get('min_samples', 5)
            model = DBSCAN(eps=eps, min_samples=min_samples)
            labels = model.fit_predict(X)
            centers = []
        
        # Prepare results
        cluster_sizes = pd.Series(labels).value_counts().to_dict()
        
        results = {
            'success': True,
            'labels': labels.tolist(),
            'cluster_sizes': cluster_sizes,
            'centers': centers,
            'features_used': numeric_cols.tolist(),
            'algorithm': algorithm
        }
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': f'Clustering failed: {str(e)}'}), 500

@app.route('/outliers', methods=['POST'])
def detect_outliers():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset uploaded'}), 400
    
    try:
        data = request.get_json()
        method = data.get('method', 'isolation')
        
        # Select numeric columns only
        numeric_cols = current_dataset.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            return jsonify({'error': 'No numeric columns found for outlier detection'}), 400
        
        # Store original indices before dropping NA
        original_data = current_dataset[numeric_cols]
        valid_indices = original_data.dropna().index
        X = original_data.dropna()
        
        if method == 'zscore':
            # Manual Z-score calculation
            z_scores = np.abs((X - X.mean()) / X.std())
            outliers_mask = (z_scores > 3).any(axis=1)
            
        elif method == 'iqr':
            Q1 = X.quantile(0.25)
            Q3 = X.quantile(0.75)
            IQR = Q3 - Q1
            outliers_mask = ((X < (Q1 - 1.5 * IQR)) | (X > (Q3 + 1.5 * IQR))).any(axis=1)
            
        elif method == 'isolation':
            model = IsolationForest(contamination=0.1, random_state=42)
            outliers_mask = model.fit_predict(X) == -1
        else:
            return jsonify({'error': 'Invalid method. Use zscore, iqr, or isolation'}), 400
        
        # Get outlier indices using the valid indices after dropping NA
        outlier_indices = valid_indices[outliers_mask].tolist()
        outlier_data = current_dataset.loc[outlier_indices].to_dict('records')
        
        return jsonify({
            'outlier_count': len(outlier_indices),
            'outlier_indices': outlier_indices[:20],
            'outlier_data': outlier_data[:20],
            'total_samples': len(X),
            'method': method,
            'outlier_percentage': round((len(outlier_indices) / len(X)) * 100, 2)
        })
    
    except Exception as e:
        return jsonify({'error': f'Outlier detection failed: {str(e)}'}), 500

@app.route('/regression', methods=['POST'])
def perform_regression():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset uploaded'}), 400
    
    try:
        data = request.get_json()
        target = data.get('target')
        features = data.get('features', [])
        
        if not target:
            return jsonify({'error': 'Target variable is required'}), 400
        
        numeric_cols = current_dataset.select_dtypes(include=[np.number]).columns
        
        if not features:
            features = [col for col in numeric_cols if col != target]
        
        if target not in numeric_cols:
            return jsonify({'error': 'Target variable must be numeric'}), 400
        
        X = current_dataset[features].dropna()
        y = current_dataset[target].dropna()
        
        # Align indices
        common_idx = X.index.intersection(y.index)
        X = X.loc[common_idx]
        y = y.loc[common_idx]
        
        if len(X) == 0:
            return jsonify({'error': 'No valid data after preprocessing'}), 400
        
        model = LinearRegression()
        model.fit(X, y)
        
        y_pred = model.predict(X)
        mse = mean_squared_error(y, y_pred)
        
        return jsonify({
            'coefficients': dict(zip(features, model.coef_.tolist())),
            'intercept': float(model.intercept_),
            'mse': float(mse),
            'r_squared': float(model.score(X, y)),
            'features_used': features,
            'target': target
        })
    
    except Exception as e:
        return jsonify({'error': f'Regression failed: {str(e)}'}), 500

# Simple Apriori Algorithm Implementation
def simple_apriori(transactions, min_support, min_confidence):
    """
    Simple Apriori algorithm implementation
    """
    # Calculate support for single items
    item_counts = {}
    for transaction in transactions:
        for item in transaction:
            item_counts[item] = item_counts.get(item, 0) + 1
    
    total_transactions = len(transactions)
    min_support_count = min_support * total_transactions
    
    # Frequent 1-itemsets
    frequent_1 = {frozenset([item]): count/total_transactions 
                  for item, count in item_counts.items() 
                  if count >= min_support_count}
    
    frequent_itemsets = {1: frequent_1}
    k = 2
    
    while True:
        # Generate candidate itemsets
        candidates = set()
        prev_itemsets = list(frequent_itemsets[k-1].keys())
        
        for i in range(len(prev_itemsets)):
            for j in range(i+1, len(prev_itemsets)):
                itemset1 = prev_itemsets[i]
                itemset2 = prev_itemsets[j]
                new_candidate = itemset1.union(itemset2)
                if len(new_candidate) == k:
                    candidates.add(new_candidate)
        
        # Count support for candidates
        candidate_counts = {}
        for candidate in candidates:
            count = 0
            for transaction in transactions:
                if candidate.issubset(transaction):
                    count += 1
            if count >= min_support_count:
                candidate_counts[candidate] = count/total_transactions
        
        if not candidate_counts:
            break
            
        frequent_itemsets[k] = candidate_counts
        k += 1
    
    # Generate association rules
    association_rules = []
    
    for k, itemsets in frequent_itemsets.items():
        if k < 2:
            continue
            
        for itemset, support in itemsets.items():
            itemset_list = list(itemset)
            
            # Generate all possible rules
            for i in range(1, k):
                for antecedent in combinations(itemset_list, i):
                    antecedent_set = frozenset(antecedent)
                    consequent_set = itemset - antecedent_set
                    
                    if consequent_set:
                        # Find support of antecedent
                        antecedent_support = 0
                        for transaction in transactions:
                            if antecedent_set.issubset(transaction):
                                antecedent_support += 1
                        antecedent_support /= total_transactions
                        
                        if antecedent_support > 0:
                            confidence = support / antecedent_support
                            # Calculate lift safely
                            consequent_support = frequent_itemsets[len(consequent_set)].get(consequent_set, 0)
                            lift = support / (antecedent_support * consequent_support) if consequent_support > 0 else 0
                            
                            if confidence >= min_confidence and lift > 0:
                                association_rules.append({
                                    'antecedents': list(antecedent_set),
                                    'consequents': list(consequent_set),
                                    'support': round(support, 4),
                                    'confidence': round(confidence, 4),
                                    'lift': round(lift, 4)
                                })
    
    # Sort rules by confidence
    association_rules.sort(key=lambda x: x['confidence'], reverse=True)
    
    return association_rules, frequent_itemsets

def combinations(arr, r):
    """Generate combinations of arr choosing r elements"""
    if r == 0:
        return [[]]
    result = []
    for i in range(len(arr)):
        for combo in combinations(arr[i+1:], r-1):
            result.append([arr[i]] + combo)
    return result

@app.route('/apriori', methods=['POST'])
def perform_apriori():
    global current_dataset
    
    if current_dataset is None:
        return jsonify({'error': 'No dataset uploaded'}), 400
    
    try:
        data = request.get_json()
        columns = data.get('columns', [])
        min_support = data.get('min_support', 0.1)
        min_confidence = data.get('min_confidence', 0.5)
        
        if not columns:
            # Use all categorical columns if none specified
            categorical_cols = current_dataset.select_dtypes(include=['object']).columns.tolist()
            if not categorical_cols:
                return jsonify({'error': 'No categorical columns found for Apriori algorithm'}), 400
            columns = categorical_cols[:4]  # Use first 4 columns by default
        
        # Prepare transactions
        transactions = []
        for _, row in current_dataset.iterrows():
            transaction = []
            for col in columns:
                if pd.notna(row[col]):
                    # Create items like "column=value"
                    item = f"{col}={row[col]}"
                    transaction.append(item)
            if transaction:  # Only add non-empty transactions
                transactions.append(transaction)
        
        if len(transactions) < 2:
            return jsonify({'error': 'Not enough transactions for Apriori algorithm'}), 400
        
        # Run Apriori algorithm
        association_rules, frequent_itemsets = simple_apriori(
            transactions, min_support, min_confidence
        )
        
        # Prepare frequent itemsets for response
        frequent_itemsets_formatted = []
        for k, itemsets in frequent_itemsets.items():
            for itemset, support in itemsets.items():
                frequent_itemsets_formatted.append({
                    'items': list(itemset),
                    'support': round(support, 4),
                    'size': k
                })
        
        # Sort frequent itemsets by support
        frequent_itemsets_formatted.sort(key=lambda x: x['support'], reverse=True)
        
        return jsonify({
            'association_rules': association_rules[:20],  # Return top 20 rules
            'frequent_itemsets': frequent_itemsets_formatted[:20],  # Return top 20 itemsets
            'total_transactions': len(transactions),
            'parameters': {
                'columns_used': columns,
                'min_support': min_support,
                'min_confidence': min_confidence
            }
        })
    
    except Exception as e:
        return jsonify({'error': f'Apriori algorithm failed: {str(e)}'}), 500

if __name__ == '__main__':
    print(" Starting Data Science Dashboard Server...")
    print(" Server will be available at: http://localhost:5000")
    print(" Backend is ready to receive requests from frontend!")
    app.run(debug=True, port=5000)