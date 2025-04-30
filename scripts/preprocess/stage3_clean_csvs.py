import csv
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count
from tqdm import tqdm
import shutil

# Directory containing Stage 2 data
STAGE2_DIR = Path('../../private/stage2')
# Directory to save the cleaned data in Stage 3
STAGE3_DIR = Path('../../private/stage3')

# Columns to drop
COLUMNS_TO_DROP = ['start_lat', 'start_lng', 'end_lat', 'end_lng', 'ended_at']

# Function to clean a single file and save it to Stage 3
def clean_file(file):
    # Get the relative path within stage2, which includes the subdirectories (station_id, year, month)
    relative_path = file.relative_to(STAGE2_DIR)

    # Create the target directory in stage3 by extracting the appropriate parts of the relative path
    target_file = STAGE3_DIR / relative_path
    target_file.parent.mkdir(parents=True, exist_ok=True)

    # Open the source file for reading
    with open(file, 'r', newline='', encoding='utf-8') as f_in:
        reader = csv.DictReader(f_in)

        # Calculate the fieldnames to write, excluding the columns to drop
        fieldnames = [field for field in reader.fieldnames if field not in COLUMNS_TO_DROP]

        rows = []
        for row in reader:
            # Filter out the dropped columns from the row
            filtered_row = {key: value for key, value in row.items() if key in fieldnames}
            rows.append(filtered_row)

    # Write the cleaned data to the corresponding file in stage3
    with open(target_file, 'w', newline='', encoding='utf-8') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

# Function to process each station directory (returning a list of CSV files to clean)
def get_csv_files_to_clean():
    files_to_clean = []
    # Traverse all directories and subdirectories under stage2
    for station_dir in STAGE2_DIR.rglob('*/*/*.csv'):  # This matches the input structure
        if station_dir.is_file():
            print(f"Found file: {station_dir}")  # Debug print
            files_to_clean.append(station_dir)
    return files_to_clean

# Function to clean files in parallel with a progress bar
def clean_stage2_files_parallel():
    # Ensure Stage 3 directory exists
    if STAGE3_DIR.exists():
        shutil.rmtree(STAGE3_DIR)  # Clean the existing backup if it exists
    STAGE3_DIR.mkdir(parents=True, exist_ok=True)

    files_to_clean = get_csv_files_to_clean()
    
    print(f"Found {len(files_to_clean)} files to clean.")

    if len(files_to_clean) == 0:
        print("No files found to clean. Please check the directory structure.")
        return

    # Use a pool of workers, twice the number of CPU cores
    num_workers = 2 * cpu_count()

    # Use tqdm for the progress bar
    with Pool(processes=num_workers) as pool:
        list(tqdm(pool.imap(clean_file, files_to_clean), total=len(files_to_clean), desc="Cleaning Files"))

    print("Stage 2 files cleaned and backed up to Stage 3 successfully.")

# Run the parallel cleanup function
if __name__ == "__main__":
    clean_stage2_files_parallel()
