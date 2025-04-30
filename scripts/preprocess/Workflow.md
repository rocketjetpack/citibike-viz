# Workflow for data preprocessing

## Data Source
Data is downloaded from Citibike's website at: https://citibikenyc.com/system-data

### Data Structure
Data is distributed in ZIP files, one for each month for 2024. Some years are distributed as entire years in a single zip file.

This project is solely looking at the year 2024, so all 12 months of ZIP files were retrieved.

#### Columns
The expected set of columns is:  
- ride_id : string, identifier for a unique ride
- rideable_type : string, either classic_bike or electric_bike
- started_at : datetime (YYYY-mm-dd HH:MM:SS.ms) the time the ride began
- ended_at : datetime (YYYY-mm-dd HH:MM:SS.ms) the time the ride ended
- start_station_name : string, name of the station the ride began at
- start_station_id : string, unique id of the station the ride began at
- end_station_name : string, name of the station the ride ended at
- end_station_id : string, unique id of the station the ride ended at
- start_lat : float, latitude of the starting station
- start_lng : float, longitude of the starting station
- end_lat : float, latitude of the ending station
- end_lng : float, longitude of the ending station
- member_casual : string, either member or casual

## Stages
I have chosen to break preprocessing into multiple stages for a few reasons.  
- Data is distributed in highly-compressed ZIP files, each containing 1 or more CSV files. Extracting this data explodes the disk usage up to 6+ GB.
- For early stages (interacting with the ZIP files) I choose to parallelize with n=12 (one task per ZIP file) to prevent weird behaviors.
- For later stages (interacting with previously generated station data CSV files) I parallelize with n=50 with each task corresponding to 1 CSV file

### Stage 0
Stage 0 is the very first step. This stage is solely focused on verifying that the data is in the form that is expected by validating that all CSV files distributed by Citibike contain the same set of columns.

### Stage 1
Stage 1 extracts a unique list of station data from the ZIP files. Stations in NYC all* have ID numbers matching the pattern "XXXX.YY". Stage 1 discards all station id's that do not match this pattern. There are some test stations, named things like LAB01. There are also some stations in New Jersey with names like JC123 (Jersey City) or HB123 (Hoboken). This project is solely focused on NYC, so these stations are dropped.

The output is a CSV file with columns:
- station_name : string
- station_id : float
- lat : float
- lng : float

### Stage 2
Stage 2 focuses on sorting individual rides into station-focused CSV files (one CSV file per station per month) and doing some column recoding as well as a couple of calculations.

Recoded columns are:  
- member_or_casual becomes either 0 for casual or 1 for member
- rideable_type becomes either 0 for classic_bike or 1 for electric_bike

New calculations are:
- ride_time = ended_at - started_at (rounded to nearest whole second)
- ride_distance = great circle distance between the start and end stations (rounded to the nearest meter)\
- direction = 0 if the station in question is the starting station, 1 if the station in question is the ending station, 2 if the station in question is both start and end (i.e. the rider dropped the bike off where they began)

### Stage 3
Stage 3 cleans up some columns that are no longer necessary in each of the station-month CSV files. The columns removed are:  
- start_lat
- start_lng
- end_lat
- end_lng
- ended_at (we have both start time and duration, this is redundant)

    {
        "start_station_id": "5470.12",
        "end_station_id": "5216.06",
        "count": 1065
    },
