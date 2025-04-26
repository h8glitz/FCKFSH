import psycopg2

def run_command(conn, command):
    cur = conn.cursor()
    try:
        cur.execute(command)
        conn.commit()
        print(f"Success: {command}")
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error: {str(e)}")
        return False
    finally:
        cur.close()

def main():
    print("Fixing database...")
    try:
        conn = psycopg2.connect(
            database="fckfshdb", 
            user="my_user", 
            password="9044", 
            host="localhost", 
            port="5432"
        )
        
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
        
        for cmd in commands:
            run_command(conn, cmd)
            
        print("All operations completed!")
    except Exception as e:
        print(f"Connection error: {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main() 