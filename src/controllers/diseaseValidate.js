const fs = require('fs');
const path = require('path');

const loadDiseaseRules = () => {
    const data = fs.readFileSync(path.join(__dirname, '..', 'JSON', 'diseaseRules.json'), 'utf8');
  return JSON.parse(data);
};

const diseaseRules = loadDiseaseRules();

const validateBloodDonationEligibility = (disease) => {
  const normalizedDisease = disease.toLowerCase();
  const rule = diseaseRules[normalizedDisease] || null;
  return rule;
};

module.exports={validateBloodDonationEligibility}
