from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
import hashlib
import secrets
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'volidam-patir-secret-key-2024')

# In-memory database (replace with PostgreSQL in production)
users = {}
sessions = {}

# Default admin
admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
users['admin'] = {
    'id': '1',
    'username': 'admin',
    'password': admin_password,
    'fullName': 'Administrator',
    'role': 'ADMIN',
    'isActive': True
}

# Mock data for dashboards
dough_entries = []
sales = []
expenses = []
shifts = []

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    return hash_password(password) == hashed

def generate_token():
    return secrets.token_urlsafe(32)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            user = users.get(session.get('username'))
            if not user or user['role'] not in roles:
                flash('Ruxsat yo\'q', 'error')
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/')
def index():
    if 'user_id' in session:
        user = users.get(session.get('username'))
        if user:
            return redirect(url_for(f"{user['role'].lower()}_dashboard"))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Login va parol kiritilishi shart', 'error')
            return render_template('login.html')
        
        user = users.get(username)
        if not user or not user['isActive']:
            flash('Noto\'g\'ri login yoki parol', 'error')
            return render_template('login.html')
        
        if not verify_password(password, user['password']):
            flash('Noto\'g\'ri login yoki parol', 'error')
            return render_template('login.html')
        
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        
        flash('Muvaffaqiyatli kirish!', 'success')
        return redirect(url_for(f"{user['role'].lower()}_dashboard"))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Chiqish muvaffaqiyatli', 'info')
    return redirect(url_for('login'))

# Admin Dashboard
@app.route('/admin')
@login_required
@role_required(['ADMIN'])
def admin_dashboard():
    return render_template('admin.html', 
                         user=users.get(session.get('username')),
                         users=users,
                         dough_entries=dough_entries,
                         sales=sales,
                         expenses=expenses)

# Hamirchi Dashboard
@app.route('/hamirchi')
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def hamirchi_dashboard():
    return render_template('hamirchi.html',
                         user=users.get(session.get('username')),
                         dough_entries=dough_entries)

# Sotuvchi Dashboard
@app.route('/sotuvchi')
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def sotuvchi_dashboard():
    return render_template('sotuvchi.html',
                         user=users.get(session.get('username')),
                         sales=sales)

# Dokonchi Dashboard
@app.route('/dokonchi')
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def dokonchi_dashboard():
    return render_template('dokonchi.html',
                         user=users.get(session.get('username')),
                         expenses=expenses)

# API Routes
@app.route('/api/users', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN'])
def api_users():
    if request.method == 'POST':
        data = request.json
        username = data.get('username')
        if username in users:
            return jsonify({'error': 'User already exists'}), 400
        
        users[username] = {
            'id': str(len(users) + 1),
            'username': username,
            'password': hash_password(data.get('password')),
            'fullName': data.get('fullName'),
            'role': data.get('role'),
            'isActive': True
        }
        return jsonify({'success': True, 'user': users[username]}), 201
    
    return jsonify({'users': list(users.values())})

@app.route('/api/dough', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def api_dough():
    if request.method == 'POST':
        data = request.json
        entry = {
            'id': len(dough_entries) + 1,
            'date': datetime.now().isoformat(),
            'flourUsed': data.get('flourUsed'),
            'waterUsed': data.get('waterUsed'),
            'yeastUsed': data.get('yeastUsed'),
            'saltUsed': data.get('saltUsed'),
            'doughProduced': data.get('doughProduced'),
            'createdBy': session.get('username')
        }
        dough_entries.append(entry)
        return jsonify({'success': True, 'entry': entry}), 201
    
    return jsonify({'entries': dough_entries})

@app.route('/api/sales', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def api_sales():
    if request.method == 'POST':
        data = request.json
        sale = {
            'id': len(sales) + 1,
            'date': datetime.now().isoformat(),
            'itemType': data.get('itemType'),
            'quantity': data.get('quantity'),
            'price': data.get('price'),
            'total': data.get('quantity') * data.get('price'),
            'paymentType': data.get('paymentType'),
            'createdBy': session.get('username')
        }
        sales.append(sale)
        return jsonify({'success': True, 'sale': sale}), 201
    
    return jsonify({'sales': sales})

@app.route('/api/expenses', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def api_expenses():
    if request.method == 'POST':
        data = request.json
        expense = {
            'id': len(expenses) + 1,
            'date': datetime.now().isoformat(),
            'type': data.get('type'),
            'amount': data.get('amount'),
            'description': data.get('description'),
            'createdBy': session.get('username')
        }
        expenses.append(expense)
        return jsonify({'success': True, 'expense': expense}), 201
    
    return jsonify({'expenses': expenses})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
