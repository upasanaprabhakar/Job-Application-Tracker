const { Parser } = require('json2csv');

const exportToCSV = (applications) => {
  const fields = [
    { label: 'Company Name', value: 'companyName' },
    { label: 'Job Title', value: 'jobTitle' },
    { label: 'Status', value: 'status' },
    { label: 'Location', value: 'location' },
    { label: 'Salary Range', value: 'salaryRange' },
    { label: 'Application Date', value: 'applicationDate' },
    { label: 'Follow Up Date', value: 'followUpDate' },
    { label: 'Job URL', value: 'jobUrl' },
    { label: 'Notes', value: 'notes' }
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(applications);
  return csv;
};

module.exports = { exportToCSV };