const fs = require('fs');
const csv = require('csv-parser');
const CSV_FILE_PATH = '.././HealthFacility (2).csv'

const searchHospitals = async (req, res) => {
    try {
        const query = req.query.q.trim().toUpperCase(); // Normalize query for case-insensitive matching
        if (!query) {
            return res.status(400).json({ message: 'Query is required' });
        }

        // Helper function to format hospital names (capitalize first letter of each word)
        const formatHospitalName = (name) => {
            return name
                .split(' ') // Split into words
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize first letter
                .join(' '); // Rejoin words
        };

        const hospitals = [];
        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv())
            .on("data", (row) => {
                const hospitalName = row["HF Name"].trim();
                const district = row["District"].trim();
                const province = row["Province"].trim();

                // Normalize query and hospital name by removing special characters
                const normalizedQuery = query.replace(/[^A-Z0-9]/g, '');
                const normalizedHospitalName = hospitalName.replace(/[^A-Z0-9]/g, '');

                // Match logic: Check if query matches hospital name, district, province, or normalized name
                if (
                    hospitalName.startsWith(query) ||
                    district.startsWith(query) ||
                    province.startsWith(query) ||
                    normalizedHospitalName.includes(normalizedQuery)
                ) {
                    const formattedHospitalName = formatHospitalName(hospitalName); // Format hospital name

                    hospitals.push({
                        hospital_name: formattedHospitalName, // Use formatted name
                        district: district,
                        province: province
                    });
                }
            })
            .on("end", () => {
                return res.json(hospitals.slice(0, 10)); // Limit results to 10
            })
            .on("error", (error) => {
                return res.status(500).json({ error: "Error reading CSV file" });
            });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { searchHospitals }