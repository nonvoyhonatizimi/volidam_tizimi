from flask import Flask, render_template, request, redirect, url_for, flash, session
from functools import wraps
import hashlib
import os
import pg8000.native
import urllib.parse
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'volidam-patir-secret-key-2024')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# ========== DB helpers ==========
def get_conn():
    url = urllib.parse.urlparse(DATABASE_URL)
    return pg8000.native.Connection(
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:],
        user=url.username,
        password=url.password,
        ssl_context=True
    )

def db_query(sql, params=None):
    conn = get_conn()
    try:
        if params:
            result = conn.run(sql, *params)
        else:
            result = conn.run(sql)
        cols = [c['name'] for c in conn.columns]
        return [dict(zip(cols, row)) for row in result]
    finally:
        conn.close()

def db_exec(sql, params=None):
    conn = get_conn()
    try:
        if params:
            conn.run(sql, *params)
        else:
            conn.run(sql)
    finally:
        conn.close()

def db_one(sql, params=None):
    rows = db_query(sql, params)
    return rows[0] if rows else None

# ========== Init DB ==========
def init_db():
    conn = get_conn()
    try:
        conn.run('''CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )''')
        conn.run('''CREATE TABLE IF NOT EXISTS dough_entries (
            id SERIAL PRIMARY KEY,
            flour_used FLOAT NOT NULL,
            water_used FLOAT NOT NULL,
            yeast_used FLOAT NOT NULL,
            salt_used FLOAT NOT NULL,
            dough_produced FLOAT NOT NULL,
            notes TEXT,
            shift VARCHAR(10) DEFAULT 'DAY',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )''')
        conn.run('''CREATE TABLE IF NOT EXISTS sales (
            id SERIAL PRIMARY KEY,
            item_type VARCHAR(20) NOT NULL,
            quantity FLOAT NOT NULL,
            price FLOAT NOT NULL,
            total FLOAT NOT NULL,
            payment_type VARCHAR(10) NOT NULL,
            notes TEXT,
            shift VARCHAR(10) DEFAULT 'DAY',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )''')
        conn.run('''CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            expense_type VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            description TEXT,
            shift VARCHAR(10) DEFAULT 'DAY',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )''')
        result = conn.run("SELECT id FROM users WHERE username = $1", ['admin'])
        if not result:
            admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
            conn.run("INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)",
                     'admin', admin_pass, 'Administrator', 'ADMIN')
    finally:
        conn.close()

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

# ========== Auth decorators ==========
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            if session.get('role') not in roles:
                flash("Ruxsat yo'q!", 'error')
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated
    return decorator

# ========== Routes ==========
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    role = session.get('role', '')
    routes = {'ADMIN': 'admin_dashboard', 'HAMIRCHI': 'hamirchi_dashboard',
              'SOTUVCHI': 'sotuvchi_dashboard', 'DOKONCHI': 'dokonchi_dashboard'}
    return redirect(url_for(routes.get(role, 'login')))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if not username or not password:
            flash("Login va parol kiritilishi shart!", 'error')
            return render_template('login.html')
        user = db_one("SELECT * FROM users WHERE username = $1 AND is_active = TRUE", [username])
        if not user or user['password'] != hash_password(password):
            flash("Noto'g'ri login yoki parol!", 'error')
            return render_template('login.html')
        session.update({'user_id': user['id'], 'username': user['username'],
                        'full_name': user['full_name'], 'role': user['role']})
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ========== ADMIN ==========
@app.route('/admin')
@login_required
@role_required(['ADMIN'])
def admin_dashboard():
    users = db_query("SELECT * FROM users ORDER BY created_at DESC")
    dough_count = (db_one("SELECT COUNT(*) as c FROM dough_entries WHERE DATE(created_at) = CURRENT_DATE") or {}).get('c', 0)
    s = db_one("SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE") or {}
    expenses_total = (db_one("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    return render_template('admin.html', users=users, dough_count=dough_count,
                           sales_count=s.get('c', 0), sales_total=s.get('t', 0),
                           expenses_total=expenses_total)

@app.route('/admin/users/add', methods=['POST'])
@login_required
@role_required(['ADMIN'])
def add_user():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    full_name = request.form.get('full_name', '').strip()
    role = request.form.get('role', '')
    if not all([username, password, full_name, role]):
        flash("Barcha maydonlarni to'ldiring!", 'error')
        return redirect(url_for('admin_dashboard'))
    try:
        db_exec("INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)",
                [username, hash_password(password), full_name, role])
        flash(f"{full_name} qo'shildi!", 'success')
    except Exception:
        flash("Bu username allaqachon mavjud!", 'error')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/users/delete/<int:user_id>', methods=['POST'])
@login_required
@role_required(['ADMIN'])
def delete_user(user_id):
    if user_id == session['user_id']:
        flash("O'zingizni o'chira olmaysiz!", 'error')
        return redirect(url_for('admin_dashboard'))
    db_exec("UPDATE users SET is_active = FALSE WHERE id = $1", [user_id])
    flash("Foydalanuvchi o'chirildi!", 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/report')
@login_required
@role_required(['ADMIN'])
def admin_report():
    dough_entries = db_query("SELECT d.*, u.full_name FROM dough_entries d LEFT JOIN users u ON d.created_by = u.id ORDER BY d.created_at DESC LIMIT 50")
    sales = db_query("SELECT s.*, u.full_name FROM sales s LEFT JOIN users u ON s.created_by = u.id ORDER BY s.created_at DESC LIMIT 50")
    expenses = db_query("SELECT e.*, u.full_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ORDER BY e.created_at DESC LIMIT 50")
    daily_sales = (db_one("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    daily_expenses = (db_one("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    return render_template('report.html', dough_entries=dough_entries, sales=sales,
                           expenses=expenses, daily_sales=daily_sales,
                           daily_expenses=daily_expenses, profit=daily_sales - daily_expenses)

# ========== HAMIRCHI ==========
@app.route('/hamirchi')
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def hamirchi_dashboard():
    entries = db_query("SELECT d.*, u.full_name FROM dough_entries d LEFT JOIN users u ON d.created_by = u.id ORDER BY d.created_at DESC LIMIT 20")
    today_total = (db_one("SELECT COALESCE(SUM(dough_produced),0) as t FROM dough_entries WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    return render_template('hamirchi.html', entries=entries, today_total=today_total)

@app.route('/hamirchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def add_dough():
    try:
        db_exec("""INSERT INTO dough_entries (flour_used, water_used, yeast_used, salt_used, dough_produced, notes, shift, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                [float(request.form['flour_used']), float(request.form['water_used']),
                 float(request.form['yeast_used']), float(request.form['salt_used']),
                 float(request.form['dough_produced']), request.form.get('notes', ''),
                 request.form.get('shift', 'DAY'), session['user_id']])
        flash("Xamir yozuvi saqlandi!", 'success')
    except Exception as e:
        flash(f"Xato: {e}", 'error')
    return redirect(url_for('hamirchi_dashboard'))

# ========== SOTUVCHI ==========
@app.route('/sotuvchi')
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def sotuvchi_dashboard():
    sales = db_query("SELECT s.*, u.full_name FROM sales s LEFT JOIN users u ON s.created_by = u.id ORDER BY s.created_at DESC LIMIT 20")
    today_total = (db_one("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    cash_total = (db_one("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE AND payment_type='CASH'") or {}).get('t', 0)
    card_total = (db_one("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE AND payment_type='CARD'") or {}).get('t', 0)
    return render_template('sotuvchi.html', sales=sales, today_total=today_total,
                           cash_total=cash_total, card_total=card_total)

@app.route('/sotuvchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def add_sale():
    try:
        qty = float(request.form['quantity'])
        price = float(request.form['price'])
        db_exec("""INSERT INTO sales (item_type, quantity, price, total, payment_type, notes, shift, created_by)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                [request.form['item_type'], qty, price, qty * price,
                 request.form['payment_type'], request.form.get('notes', ''),
                 request.form.get('shift', 'DAY'), session['user_id']])
        flash("Sotuv saqlandi!", 'success')
    except Exception as e:
        flash(f"Xato: {e}", 'error')
    return redirect(url_for('sotuvchi_dashboard'))

# ========== DOKONCHI ==========
@app.route('/dokonchi')
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def dokonchi_dashboard():
    expenses = db_query("SELECT e.*, u.full_name FROM expenses e LEFT JOIN users u ON e.created_by = u.id ORDER BY e.created_at DESC LIMIT 20")
    today_total = (db_one("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE DATE(created_at) = CURRENT_DATE") or {}).get('t', 0)
    return render_template('dokonchi.html', expenses=expenses, today_total=today_total)

@app.route('/dokonchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def add_expense():
    try:
        db_exec("""INSERT INTO expenses (expense_type, amount, description, shift, created_by)
                   VALUES ($1, $2, $3, $4, $5)""",
                [request.form['expense_type'], float(request.form['amount']),
                 request.form.get('description', ''), request.form.get('shift', 'DAY'),
                 session['user_id']])
        flash("Xarajat saqlandi!", 'success')
    except Exception as e:
        flash(f"Xato: {e}", 'error')
    return redirect(url_for('dokonchi_dashboard'))

if __name__ == '__main__':
    if DATABASE_URL:
        init_db()
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
