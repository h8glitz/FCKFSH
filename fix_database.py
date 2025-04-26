import sys
import subprocess
import importlib

# Try to import psycopg2, install if not available
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    print("psycopg2 is already installed.")
except ImportError:
    print("Installing psycopg2...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    print("psycopg2 installed successfully.")

def fix_database():
    try:
        # Connect using DSN string
        print("Connecting to database...")
        dsn = "dbname='spa' user='postgres' password='postgres' host='localhost'"
        conn = psycopg2.connect(dsn)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # SQL commands to change column types to BIGINT
        commands = [
            'ALTER TABLE users ALTER COLUMN id TYPE BIGINT',
            'ALTER TABLE brands ALTER COLUMN creator_id TYPE BIGINT',
            'ALTER TABLE brand_members ALTER COLUMN user_id TYPE BIGINT',
            'ALTER TABLE comments ALTER COLUMN user_id TYPE BIGINT',
            'ALTER TABLE likes ALTER COLUMN user_id TYPE BIGINT',
            'ALTER TABLE news_views ALTER COLUMN user_id TYPE BIGINT',
            'ALTER TABLE friends ALTER COLUMN user_id TYPE BIGINT',
            'ALTER TABLE friends ALTER COLUMN friend_id TYPE BIGINT',
            'ALTER TABLE friends ALTER COLUMN referrer_id TYPE BIGINT'
        ]
        
        # Execute each command
        for cmd in commands:
            try:
                print(f"Executing: {cmd}")
                cur.execute(cmd)
                print(f"Successfully executed: {cmd}")
            except Exception as e:
                print(f"Error executing {cmd}: {str(e)}")
        
        print("Database update completed!")
        
    except Exception as e:
        print(f"Database connection error: {str(e)}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_database() 