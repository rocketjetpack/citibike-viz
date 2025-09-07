import zipfile
import os
import csv
import io

# Path to the directory containing the ZIP files
zip_directory = '../../private/raw_data/2024/'

# Function to extract CSV headers and compare
def check_csv_columns(zip_file_path, reference_columns=None):
    column_sets = []

    # Open the ZIP file
    with zipfile.ZipFile(zip_file_path, 'r') as zip_file:
        print(f"Zip File: {zip_file_path}")
        # Get all CSV file names in the ZIP
        csv_files = [name for name in zip_file.namelist() if name.endswith('.csv')]
        
        for csv_file in csv_files:
            print(f"   CSV File: {csv_file}")
            # Open the CSV file and decode it properly
            with zip_file.open(csv_file) as f:
                # Wrap the binary file stream in a TextIOWrapper to decode bytes to string
                with io.TextIOWrapper(f, encoding='utf-8') as text_file:
                    reader = csv.reader(text_file)
                    header = next(reader)  # First line is the header
                    column_sets.append(set(header))  # Add the set of columns to the list

    # If it's the first ZIP file, store the column headers as the reference
    if reference_columns is None:
        reference_columns = column_sets[0]

    # Compare the sets of columns
    for i, columns in enumerate(column_sets):
        if columns != reference_columns:
            print(f"CSV file {csv_files[i]} in '{zip_file_path}' has different columns.")
            return False  # Stop further comparison if a mismatch is found

    return True

# Initialize a variable to store the reference columns
reference_columns = None

# Loop through all ZIP files in the specified directory
for filename in os.listdir(zip_directory):
    if filename.endswith('.zip'):
        zip_file_path = os.path.join(zip_directory, filename)
        if not check_csv_columns(zip_file_path, reference_columns):
            print(f"Column mismatch detected in '{zip_file_path}'. Exiting.")
            break
        else:
            print(f"CSV files in '{zip_file_path}' have matching columns.")