import os
import glob
import shutil
from multiprocessing import Pool, cpu_count
from stage1_worker import process_zip_batch

STATION_LIST_PATH = '../../private/stage0/station_list.csv'
RAW_DATA_DIR = '../../private/raw_data/2024/'
OUTPUT_BASE_DIR = '../../private/stage1/stations/'

def chunk_zip_files(file_list, num_chunks):
    avg = len(file_list) // num_chunks
    return [file_list[i * avg: (i + 1) * avg] for i in range(num_chunks - 1)] + [file_list[(num_chunks - 1) * avg:]]

if __name__ == '__main__':
    zip_files = sorted(glob.glob(os.path.join(RAW_DATA_DIR, '*.zip')))
    num_procs = min(cpu_count(), len(zip_files))

    if os.path.exists(OUTPUT_BASE_DIR):
        shutil.rmtree(OUTPUT_BASE_DIR)
    os.makedirs(OUTPUT_BASE_DIR, exist_ok=True)

    zip_batches = chunk_zip_files(zip_files, num_procs)

    print(f"Processing {len(zip_files)} ZIP files with {num_procs} processes...")

    with Pool(num_procs) as pool:
        pool.starmap(process_zip_batch, [(batch, STATION_LIST_PATH, OUTPUT_BASE_DIR) for batch in zip_batches])

    print("Stage 1 (parallel) complete.")

