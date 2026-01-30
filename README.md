# Hospital Cost Itemizer

A static website for searching and itemizing hospital costs. Users can search through hospital charges, add items to a list, and see itemized costs with totals.
<img width="1191" height="881" alt="sf" src="https://github.com/user-attachments/assets/feac62cf-de56-4d9a-946f-ba62cdf7c622" />

## Features

- Search hospital charges by description or code (NDC, CPT, etc.)
- Toggle between Gross Charge and Discounted Cash prices
- Add items to an itemized list
- Adjust quantities for each item
- View subtotal and total costs
- Cart persists across browser sessions (localStorage)
- Print-friendly itemized list
- Mobile responsive design

## Deployment on GitHub Pages

1. Go to your repository Settings
2. Navigate to "Pages" in the sidebar
3. Under "Source", select "Deploy from a branch"
4. Select the branch (e.g., `main`) and folder (`/ (root)`)
5. Click Save

The site will be available at `https://<username>.github.io/<repository-name>/`

## Updating the Data

The hospital charge data is stored in `data/charges.json`. To update with actual data:

1. Download the JSON data from the hospital's price transparency page
   - Saint Francis Hospital data: https://www.saintfrancis.com/finance/sfh-cms-hpt
2. Replace the contents of `data/charges.json` with the downloaded data
3. Commit and push the changes

The JSON should follow this structure:
```json
{
  "hospital_name": "Hospital Name",
  "last_updated_on": "YYYY-MM-DD",
  "hospital_address": ["Address"],
  "standard_charge_information": [
    {
      "description": "Item Description",
      "drug_information": {"unit": "1", "type": "EA"},
      "code_information": [{"code": "0000-0000-00", "type": "NDC"}],
      "standard_charges": [{"gross_charge": 100.00, "discounted_cash": 40.00}]
    }
  ]
}
```

## Local Development

Simply open `index.html` in a web browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server installed)
npx http-server
```

Then visit `http://localhost:8000`

## File Structure

```
├── index.html          # Main HTML page
├── css/
│   └── styles.css      # Stylesheet
├── js/
│   └── app.js          # Application JavaScript
├── data/
│   └── charges.json    # Hospital charge data
└── README.md           # This file
```

## Disclaimer

This tool is for informational purposes only. Actual hospital charges may vary based on individual circumstances, insurance coverage, and other factors. Always consult with the hospital's billing department for accurate pricing information.
