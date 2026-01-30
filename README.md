# Hospital Cost Itemizer

A static website for searching and itemizing hospital costs from Saint Francis Hospital. Search through thousands of charges, compare drug prices by dose, and build an itemized cost estimate.

**Live Site:** [https://robbie-med.github.io/Sfprice/](https://robbie-med.github.io/Sfprice/)

## Features

### Search & Browse
- Search hospital charges by description, NDC code, CPT code, or HCPCS code
- Filter results by item type (Pharmacy, Procedures, Rooms, Supplies)
- Toggle between Gross Charge and Discounted Cash pricing

### Standardized Drug Information
- Parses drug descriptions to extract strength, route, and dosage form
- Displays standardized badges for easy comparison:
  - **Strength** - e.g., "10 MG/ML", "325 MG"
  - **Route** - Oral, Intravenous, Nasal, Topical, etc.
  - **Form** - Tablet, Solution, Capsule, Cream, etc.
  - **Package** - Quantity and unit (e.g., "100 EA", "500 ML")
- Calculates price per unit ($/mg, $/mL, $/each) for comparison

### Cost Itemizer
- Add items to an itemized list
- Adjust quantities with +/- controls
- View line totals and running total
- Cart persists across browser sessions (localStorage)
- Print-friendly itemized list

### User Experience
- Dark mode toggle (respects system preference)
- Mobile responsive design
- Fast search with debouncing

## Data Source

Hospital charge data from Saint Francis Hospital, Tulsa, OK:
- [Standard Hospital Charges (JSON)](https://www.saintfrancis.com/patients-and-guests/billing-and-insurance/standard-hospital-charges#JSON)

## Deployment on GitHub Pages

1. Go to your repository **Settings**
2. Navigate to **Pages** in the sidebar
3. Under "Source", select **Deploy from a branch**
4. Select the branch and folder (`/ (root)`)
5. Click **Save**

The site will be available at `https://<username>.github.io/<repository-name>/`

## Updating the Data

The hospital charge data is stored in `data/charges.json`. To update:

1. Download the JSON data from the [hospital's price transparency page](https://www.saintfrancis.com/patients-and-guests/billing-and-insurance/standard-hospital-charges#JSON)
2. Replace the contents of `data/charges.json`
3. Commit and push the changes

### Expected Data Structure

```json
{
  "hospital_name": "Hospital Name",
  "last_updated_on": "YYYY-MM-DD",
  "hospital_address": ["Address"],
  "standard_charge_information": [
    {
      "description": "ACETAMINOPHEN 325 MG PO TAB",
      "drug_information": {"unit": "100", "type": "EA"},
      "code_information": [{"code": "0000-0000-00", "type": "NDC"}],
      "standard_charges": [{
        "gross_charge": 2.50,
        "discounted_cash": 1.00,
        "setting": "both",
        "billing_class": "facility"
      }]
    }
  ]
}
```

## Local Development

Open `index.html` directly in a browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

Then visit `http://localhost:8000`

## File Structure

```
Sfprice/
├── index.html          # Main HTML page
├── css/
│   └── styles.css      # Styles including dark mode
├── js/
│   └── app.js          # App logic and DrugParser class
├── data/
│   └── charges.json    # Hospital charge data
└── README.md
```

## Technical Details

### DrugParser Class
Parses drug descriptions to extract:
- Drug name
- Strength and units (MG, MCG, MEQ, UNITS, %)
- Concentration (e.g., 10 MG/ML)
- Route abbreviations (PO, IV, IM, SC, TD, NA, etc.)
- Form abbreviations (SOLN, TABS, CAPS, SOLR, SUSP, etc.)

### Supported Code Types
- **NDC** - National Drug Code (pharmacy items)
- **CPT** - Current Procedural Terminology
- **HCPCS** - Healthcare Common Procedure Coding System
- **CDM** - Charge Description Master
- **RC** - Revenue Code
- **MS-DRG** - Medicare Severity Diagnosis Related Group

## Disclaimer

This tool is for informational purposes only. Actual hospital charges may vary based on individual circumstances, insurance coverage, and other factors. Always consult with the hospital's billing department for accurate pricing information.

## Credits

Built by [robbiemed.org](https://robbiemed.org)
