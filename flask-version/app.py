from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
import hashlib
import os
import psycopg2
import psycopg2.extras
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'volidam-patir-secret-key-2024')

DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS dough_entries (
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
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS sales (
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
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            expense_type VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            description TEXT,
            shift VARCHAR(10) DEFAULT 'DAY',
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')
    # Create default admin if not exists
    cur.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cur.fetchone():
        admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
        cur.execute(
            "INSERT INTO users (username, password, full_name, role) VALUES (%s, %s, %s, %s)",
            ('admin', admin_pass, 'Administrator', 'ADMIN')
        )
    conn.commit()
    cur.close()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

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

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    role = session.get('role', '')
    if role == 'ADMIN':
        return redirect(url_for('admin_dashboard'))
    elif role == 'HAMIRCHI':
        return redirect(url_for('hamirchi_dashboard'))
    elif role == 'SOTUVCHI':
        return redirect(url_for('sotuvchi_dashboard'))
    elif role == 'DOKONCHI':
        return redirect(url_for('dokonchi_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if not username or not password:
            flash("Login va parol kiritilishi shart!", 'error')
            return render_template('login.html')
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT * FROM users WHERE username = %s AND is_active = TRUE", (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if not user or user['password'] != hash_password(password):
            flash("Noto'g'ri login yoki parol!", 'error')
            return render_template('login.html')
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['full_name'] = user['full_name']
        session['role'] = user['role']
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
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT * FROM users ORDER BY created_at DESC")
    users = cur.fetchall()
    cur.execute("SELECT COUNT(*) as c FROM dough_entries WHERE DATE(created_at) = CURRENT_DATE")
    dough_count = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) as c, COALESCE(SUM(total),0) as total FROM sales WHERE DATE(created_at) = CURRENT_DATE")
    sales_data = cur.fetchone()
    cur.execute("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE DATE(created_at) = CURRENT_DATE")
    expenses_total = cur.fetchone()['total']
    cur.close()
    conn.close()
    return render_template('admin.html',
        users=users,
        dough_count=dough_count,
        sales_count=sales_data['c'],
        sales_total=sales_data['total'],
        expenses_total=expenses_total
    )

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
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (username, password, full_name, role) VALUES (%s, %s, %s, %s)",
            (username, hash_password(password), full_name, role)
        )
        conn.commit()
        flash(f"{full_name} muvaffaqiyatli qo'shildi!", 'success')
    except psycopg2.IntegrityError:
        conn.rollback()
        flash("Bu username allaqachon mavjud!", 'error')
    finally:
        cur.close()
        conn.close()
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/users/delete/<int:user_id>', methods=['POST'])
@login_required
@role_required(['ADMIN'])
def delete_user(user_id):
    if user_id == session['user_id']:
        flash("O'zingizni o'chira olmaysiz!", 'error')
        return redirect(url_for('admin_dashboard'))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET is_active = FALSE WHERE id = %s", (user_id,))
    conn.commit()
    cur.close()
    conn.close()
    flash("Foydalanuvchi o'chirildi!", 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/report')
@login_required
@role_required(['ADMIN'])
def admin_report():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT d.*, u.full_name FROM dough_entries d
        LEFT JOIN users u ON d.created_by = u.id
        ORDER BY d.created_at DESC LIMIT 50
    """)
    dough_entries = cur.fetchall()
    cur.execute("""
        SELECT s.*, u.full_name FROM sales s
        LEFT JOIN users u ON s.created_by = u.id
        ORDER BY s.created_at DESC LIMIT 50
    """)
    sales = cur.fetchall()
    cur.execute("""
        SELECT e.*, u.full_name FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        ORDER BY e.created_at DESC LIMIT 50
    """)
    expenses = cur.fetchall()
    cur.execute("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE")
    daily_sales = cur.fetchone()['t']
    cur.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE DATE(created_at) = CURRENT_DATE")
    daily_expenses = cur.fetchone()['t']
    cur.close()
    conn.close()
    return render_template('report.html',
        dough_entries=dough_entries,
        sales=sales,
        expenses=expenses,
        daily_sales=daily_sales,
        daily_expenses=daily_expenses,
        profit=daily_sales - daily_expenses
    )

# ========== HAMIRCHI ==========
@app.route('/hamirchi')
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def hamirchi_dashboard():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT d.*, u.full_name FROM dough_entries d
        LEFT JOIN users u ON d.created_by = u.id
        ORDER BY d.created_at DESC LIMIT 20
    """)
    entries = cur.fetchall()
    cur.execute("SELECT COALESCE(SUM(dough_produced),0) as t FROM dough_entries WHERE DATE(created_at) = CURRENT_DATE")
    today_total = cur.fetchone()['t']
    cur.close()
    conn.close()
    return render_template('hamirchi.html', entries=entries, today_total=today_total)

@app.route('/hamirchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'HAMIRCHI'])
def add_dough():
    flour = request.form.get('flour_used')
    water = request.form.get('water_used')
    yeast = request.form.get('yeast_used')
    salt = request.form.get('salt_used')
    dough = request.form.get('dough_produced')
    notes = request.form.get('notes', '')
    shift = request.form.get('shift', 'DAY')
    if not all([flour, water, yeast, salt, dough]):
        flash("Barcha maydonlarni to'ldiring!", 'error')
        return redirect(url_for('hamirchi_dashboard'))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO dough_entries (flour_used, water_used, yeast_used, salt_used, dough_produced, notes, shift, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (flour, water, yeast, salt, dough, notes, shift, session['user_id']))
    conn.commit()
    cur.close()
    conn.close()
    flash("Xamir yozuvi saqlandi!", 'success')
    return redirect(url_for('hamirchi_dashboard'))

# ========== SOTUVCHI ==========
@app.route('/sotuvchi')
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def sotuvchi_dashboard():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT s.*, u.full_name FROM sales s
        LEFT JOIN users u ON s.created_by = u.id
        ORDER BY s.created_at DESC LIMIT 20
    """)
    sales = cur.fetchall()
    cur.execute("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE")
    today_total = cur.fetchone()['t']
    cur.execute("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE AND payment_type='CASH'")
    cash_total = cur.fetchone()['t']
    cur.execute("SELECT COALESCE(SUM(total),0) as t FROM sales WHERE DATE(created_at) = CURRENT_DATE AND payment_type='CARD'")
    card_total = cur.fetchone()['t']
    cur.close()
    conn.close()
    return render_template('sotuvchi.html',
        sales=sales,
        today_total=today_total,
        cash_total=cash_total,
        card_total=card_total
    )

@app.route('/sotuvchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'SOTUVCHI'])
def add_sale():
    item_type = request.form.get('item_type')
    quantity = float(request.form.get('quantity', 0))
    price = float(request.form.get('price', 0))
    payment_type = request.form.get('payment_type')
    notes = request.form.get('notes', '')
    shift = request.form.get('shift', 'DAY')
    total = quantity * price
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO sales (item_type, quantity, price, total, payment_type, notes, shift, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (item_type, quantity, price, total, payment_type, notes, shift, session['user_id']))
    conn.commit()
    cur.close()
    conn.close()
    flash("Sotuv saqlandi!", 'success')
    return redirect(url_for('sotuvchi_dashboard'))

# ========== DOKONCHI ==========
@app.route('/dokonchi')
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def dokonchi_dashboard():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("""
        SELECT e.*, u.full_name FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        ORDER BY e.created_at DESC LIMIT 20
    """)
    expenses = cur.fetchall()
    cur.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE DATE(created_at) = CURRENT_DATE")
    today_total = cur.fetchone()['t']
    cur.close()
    conn.close()
    return render_template('dokonchi.html', expenses=expenses, today_total=today_total)

@app.route('/dokonchi/add', methods=['POST'])
@login_required
@role_required(['ADMIN', 'DOKONCHI'])
def add_expense():
    expense_type = request.form.get('expense_type')
    amount = request.form.get('amount')
    description = request.form.get('description', '')
    shift = request.form.get('shift', 'DAY')
    if not all([expense_type, amount]):
        flash("Barcha maydonlarni to'ldiring!", 'error')
        return redirect(url_for('dokonchi_dashboard'))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO expenses (expense_type, amount, description, shift, created_by)
        VALUES (%s, %s, %s, %s, %s)
    """, (expense_type, amount, description, shift, session['user_id']))
    conn.commit()
    cur.close()
    conn.close()
    flash("Xarajat saqlandi!", 'success')
    return redirect(url_for('dokonchi_dashboard'))

if __name__ == '__main__':
    if DATABASE_URL:
        init_db()
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
