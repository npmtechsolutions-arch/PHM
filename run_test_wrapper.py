import subprocess
import sys

def main():
    with open('test_output.txt', 'w') as f:
        try:
            result = subprocess.run(
                [sys.executable, 'test_backend.py'], 
                capture_output=True, 
                text=True,
                check=False
            )
            f.write(result.stdout)
            if result.stderr:
                f.write("\nSTDERR:\n")
                f.write(result.stderr)
        except Exception as e:
            f.write(f"Failed to run test: {e}")

if __name__ == "__main__":
    main()
