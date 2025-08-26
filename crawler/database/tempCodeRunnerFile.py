MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'a2airbnb'),
    'charset': 'utf8mb4',
    'use_unicode': True,
    'autocommit': False  # Changed to False to manage transactions manually
}