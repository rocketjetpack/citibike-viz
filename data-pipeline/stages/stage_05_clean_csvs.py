import csv
import os
from pathlib import Path
from multiprocessing import Pool, cpu_count
from tqdm import tqdm
import shutil

# Columns to drop
COLUMNS_TO_DROP = ['start_lat', 'start_lng', 'end_lat', 'end_lng', 'ended_at']

# Function to clean a single file and save it to Stage 3
def clean_file(args):
    file, work_dir, output_dir = args
    # Get the relative path within stage2, which includes the subdirectories (station_id, year, month)
    relative_path = file.relative_to(work_dir)

    # Create the target directory in stage3 by extracting the appropriate parts of the relative path
    target_file = output_dir / relative_path
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
def get_csv_files_to_clean(work_dir):
    files_to_clean = []
    # Traverse all directories and subdirectories under stage2
    for station_dir in work_dir.rglob('*/*/*.csv'):  # This matches the input structure
        if station_dir.is_file():
            files_to_clean.append(station_dir)
    return files_to_clean

# Function to clean files in parallel with a progress bar
def clean_stage2_files_parallel(work_dir, output_dir):
    files_to_clean = get_csv_files_to_clean(work_dir)
    
    print(f"Found {len(files_to_clean)} files to clean.")
    args_list = [(fname, work_dir, output_dir) for fname in files_to_clean]

    if len(files_to_clean) == 0:
        print("No files found to clean. Please check the directory structure.")
        return

    # Use a pool of workers, twice the number of CPU cores
    num_workers = 2 * cpu_count()

    # Use tqdm for the progress bar
    with Pool(processes=num_workers) as pool:
        list(tqdm(pool.imap(clean_file, args_list), total=len(args_list), desc="Cleaning Files"))

    return files_to_clean

# Run the parallel cleanup function
def run(input_dir, work_dir, output_dir):
    # As the first step, copy the contents of output_dir to work_dir
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

    if output_dir.exists():
        print(f"[COPY] Syncing {output_dir} to {work_dir}")
        for item in output_dir.iterdir():
            dest = work_dir / item.name
            if item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)

    # Proceed with stage
    clean_stage2_files_parallel(work_dir, output_dir)

    # If were still running things are good, copy work_dir to output_dir
    print(f"[COPY] Syncing {work_dir} to {output_dir}")
    if not output_dir.exists():
        output_dir.mkdir(parents=True)
    for item in work_dir.iterdir():
        dest = output_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)

if __name__ == "__main__":
    print("Do not run this script interactively.")
