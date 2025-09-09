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
def process_file(args):
    file, work_dir = args
    # Get the relative path within stage3, which includes the subdirectories (station_id, year, month)
    relative_path = file.relative_to(work_dir)

    # Create the target directory in stage4 by extracting the appropriate parts of the relative path
    target_file = work_dir / relative_path.with_suffix('.json')
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
def get_csv_files_to_process(work_dir):
    files_to_process = []
    # Traverse all directories and subdirectories under stage3
    for station_dir in work_dir.rglob('*/*/*.csv'):  # This matches the input structure
        if station_dir.is_file():
            files_to_process.append(station_dir)
    return files_to_process

# Function to process files in parallel with a progress bar
def process_stage3_files_parallel(work_dir):
    files_to_process = get_csv_files_to_process(work_dir)
    
    print(f"Found {len(files_to_process)} files to process.")

    if len(files_to_process) == 0:
        print("No files found to process. Please check the directory structure.")
        return

    # Use a pool of workers, twice the number of CPU cores
    num_workers = 2 * cpu_count()

    args_list = [(fname, work_dir) for fname in files_to_process]


    # Use tqdm for the progress bar
    with Pool(processes=num_workers) as pool:
        list(tqdm(pool.imap(process_file, args_list), total=len(args_list), desc="Processing Files"))

    print("Stage 3 files processed and converted to JSON in Stage 4 successfully.")

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
    
    process_stage3_files_parallel(work_dir)

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

    # Clean up all csv files from station data directories in output_dir/*/*/
    #files_to_process = get_csv_files_to_process(work_dir)
    #for f in files_to_process:
    #    try:
    #        Path(output_dir, f).unlink()
    #    except FileNotFoundError:
    #        pass
    #    except Exception as e:
    #        print(f"[Error]: Stage 06 unable to remove input csv file {output_dir}/{f}")
    #        pass
        
# Run the parallel processing function
if __name__ == "__main__":
    print("Do not run this script interactively.")
