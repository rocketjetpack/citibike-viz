import csv
import json

csv_path = "../public_html/data/station_list.csv"
json_path = "../public_html/data/station_list.json"

with open(csv_path, newline='', encoding='utf-8') as csvfile:
  reader = csv.DictReader(csvfile)
  stations = []
  for row in reader:
    stations.append(row)

with open(json_path, "w", encoding='utf-8') as jsonfile:
  json.dump(stations, jsonfile, indent=2)

print("Complete")