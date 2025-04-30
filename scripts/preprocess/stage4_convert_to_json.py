import csv
import json
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count
from tqdm import tqdm
import shutil

# Directory containing Stage 3 data
STAGE3_DIR = Path('../../private/stage3')
# Directory to save the JSON files in Stage 4
STAGE4_DIR = Path('../../private/stage4')

# Function to convert CSV to JSON and calculate the new variables
def process_file(file):
    # Get the relative path within stage3, which includes the subdirectories (station_id, year, month)
    relative_path = file.relative_to(STAGE3_DIR)

    # Create the target directory in stage4 by extracting the appropriate parts of the relative path
    target_file = STAGE4_DIR / relative_path.with_suffix('.json')
    target_file.parent.mkdir(parents=True, exist_ok=True)

    # Read the CSV file and calculate metrics
    total_inbound = 0
    total_outbound = 0
    rides = []

    with open(file, 'r', newline='', encoding='utf-8') as f_in:
        reader = csv.DictReader(f_in)
        
        for row in reader:
            direction = int(row['direction'])
            if direction == 1:
                total_inbound += 1
            elif direction == 0:
                total_outbound += 1
            rides.append(row)

    # Calculate bike flux
    bike_flux = total_inbound - total_outbound

    # Prepare the data to be saved in JSON
    output_data = {
        "rides": rides,  # All ride data from CSV
        "summary": {
            "total_inbound": total_inbound,
            "total_outbound": total_outbound,
            "flux": bike_flux
        }
    }

    # Save to JSON file
    with open(target_file, 'w', encoding='utf-8') as f_out:
        json.dump(output_data, f_out, indent=4)

# Function to process each station directory (returning a list of CSV files to process)
def get_csv_files_to_process():
    files_to_process = []
    # Traverse all directories and subdirectories under stage3
    for station_dir in STAGE3_DIR.rglob('*/*/*.csv'):  # This matches the input structure
        if station_dir.is_file():
            files_to_process.append(station_dir)
    return files_to_process

# Function to process files in parallel with a progress bar
def process_stage3_files_parallel():
    # Ensure Stage 4 directory exists
    if STAGE4_DIR.exists():
        shutil.rmtree(STAGE4_DIR)  # Clean the existing backup if it exists
    STAGE4_DIR.mkdir(parents=True, exist_ok=True)

    files_to_process = get_csv_files_to_process()
    
    print(f"Found {len(files_to_process)} files to process.")

    if len(files_to_process) == 0:
        print("No files found to process. Please check the directory structure.")
        return

    # Use a pool of workers, twice the number of CPU cores
    num_workers = 2 * cpu_count()

    # Use tqdm for the progress bar
    with Pool(processes=num_workers) as pool:
        list(tqdm(pool.imap(process_file, files_to_process), total=len(files_to_process), desc="Processing Files"))

    print("Stage 3 files processed and converted to JSON in Stage 4 successfully.")

# Run the parallel processing function
if __name__ == "__main__":
    process_stage3_files_parallel()
