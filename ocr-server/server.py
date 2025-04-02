from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import base64
import io
from PIL import Image
import numpy as np
import time
import re

# Fix for SSL certificate verification issues
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize EasyOCR reader with English language
reader = None

def get_reader():
    global reader
    if reader is None:
        print("Initializing EasyOCR reader...")
        reader = easyocr.Reader(['en'], gpu=False)
    return reader

# Component type mapping based on part prefixes and keywords
COMPONENT_TYPES = {
    # Map prefixes to component types
    "PREFIX_MAP": {
        'KBHP': 'Hydraulic',
        'KBHT': 'Hydraulic',
        'KPHD': 'Hydraulic',
        'KPHE': 'Hydraulic',
        'KGHN': 'Hydraulic', 
        'KGHP': 'Hydraulic',
        '21M9': 'Electrical',
        '21K9': 'Electrical',
        '21L7': 'Electrical',
        '21E4': 'Electrical',
        '31Q5': 'Electrical',
        '31E4': 'Electrical',
        '11N6': 'Engine',
        '11G2': 'Engine',
        '11F2': 'Engine',
        '11H3': 'Engine',
        'XKAN': 'Electrical',
        'XKCH': 'Hydraulic',  # Added XKCH here
        'SE23': 'Hydraulic'
    },
    
    # Map keywords in part names to component types
    "KEYWORD_MAP": {
        'CONTROL UNIT': 'Electrical',
        'MCU': 'Electrical',
        'ECU': 'Electrical',
        'SENSOR': 'Electrical',
        'SWITCH': 'Electrical',
        'RESISTOR': 'Electrical',
        'RING': 'Hydraulic',
        'SEAL': 'Hydraulic', 
        'GASKET': 'Hydraulic',
        'PUMP': 'Hydraulic',
        'VALVE': 'Hydraulic',
        'SOLENOID': 'Hydraulic',
        'CYLINDER': 'Hydraulic',
        'FILTER': 'Maintenance',
        'ENGINE': 'Engine',
        'MOTOR': 'Engine',
        'PISTON': 'Engine',
        'BEARING': 'Mechanical',
        'GEAR': 'Mechanical',
        'SHAFT': 'Mechanical'
    }
}

# Valid Hyundai part prefixes
VALID_HYUNDAI_PREFIXES = [
    # Hydraulic Components
    'KBHP', 'KBHT', 'KPHD', 'KPHE', 'KGHN', 'KGHP',
    # Control Units & Electrical
    '21M9', '21K9', '21L7', '21E4', '31Q5', '31E4', '21EM', '21EN', '21K3', '21L9',
    # Engine Components
    '11N6', '11G2', '11F2', '11H3', '11EB', '11QA',
    # Additional validated prefixes
    '22B4', '31N7', '31M5', '31Q2', 'SE23', 'XKAN', 'XKCH'  # Added XKCH here
]

# Known Hyundai parts database
KNOWN_PARTS = {
    'XKCH-00054': {
        'name': 'VALVE-SOLENOID',
        'component': 'Hydraulic'
    },
    'SE23-16545': {
        'name': 'CONTROL VALVE ASSEMBLY',
        'component': 'Hydraulic'
    }
}

@app.route('/scan', methods=['POST'])
def scan_image():
    try:
        # Get base64 encoded image from request
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        
        # Remove data URL prefix if present
        if 'data:image' in image_data:
            image_data = image_data.split(',')[1]
        
        # Convert base64 to image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to numpy array for EasyOCR
        image_np = np.array(image)
        
        # Get EasyOCR reader
        reader = get_reader()
        
        # Process image with EasyOCR
        start_time = time.time()
        results = reader.readtext(
            image_np,
            detail=0,  # Just get text strings
            paragraph=False,  # Don't group text
            contrast_ths=0.1,  # Lower threshold for contrast
            allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',  # Allow only these characters
            blocklist='{}[]()*/\\@#$%^&_=+',  # Ignore these characters
        )
        processing_time = time.time() - start_time
        
        # Join all detected text
        text = " ".join(results)
        print("Full detected text:", text)
        
        # Extract part information
        part_info = extract_part_info(text)
        
        if not part_info.get('partNumber'):
            return jsonify({
                'success': False,
                'error': 'Could not identify a valid part number',
                'text': text,
                'processing_time': processing_time
            })
        
        return jsonify({
            'success': True,
            'result': {
                'partsNumber': part_info.get('partNumber', ''),
                'partsName': part_info.get('partName', ''),
                'component': part_info.get('component', '')
            },
            'text': text,
            'processing_time': processing_time
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def extract_part_info(text):
    # Clean up text
    clean_text = re.sub(r'\s+', ' ', text).strip().upper()
    print('Cleaned OCR text:', clean_text)
    
    # Special priority for XKCH pattern which tends to be clearer in labels
    xkch_match = re.search(r'XKCH\s*[-–—]?\s*([0-9]{5})', clean_text)
    if xkch_match:
        part_number = f"XKCH-{xkch_match.group(1)}"
        part_name = "VALVE-SOLENOID"
        component = "Hydraulic"
        return {
            'partNumber': part_number,
            'partName': part_name,
            'component': component,
            'confidence': 0.95
        }
    
    # Check for other specific known patterns
    for known_part in KNOWN_PARTS.keys():
        if known_part in clean_text:
            return {
                'partNumber': known_part,
                'partName': KNOWN_PARTS[known_part]['name'],
                'component': KNOWN_PARTS[known_part]['component'],
                'confidence': 0.9
            }
    
    # Try to find part number patterns
    part_number_patterns = [
        r'([A-Z0-9]{2,5})[-–—]([0-9A-Z]{4,7})',  # Standard format: ABCD-12345
        r'([A-Z0-9]{2,5})\s+[-–—]\s+([0-9A-Z]{4,7})',  # With spaces: ABCD - 12345
        r'([A-Z0-9]{2,5})[il1]\s*([0-9A-Z]{4,7})',  # OCR errors: ABCD1 12345 (1 instead of dash)
        r'([A-Z0-9]{2,5})\s+([0-9A-Z]{4,7})',  # Without dash: ABCD 12345
        r'SE23[EF]3[1Il][-–—]?([0-9]{5})'  # Special pattern for SE23E31 labels
    ]
    
    part_number = None
    
    # Try each pattern
    for pattern in part_number_patterns:
        matches = re.findall(pattern, clean_text)
        if matches:
            # Found a match
            if 'SE23' in pattern:
                # Special case for SE23E31 pattern
                part_number = 'SE23E31-' + matches[0]
            else:
                # Standard pattern
                prefix = matches[0][0]
                number = matches[0][1]
                
                # Check if this is a known prefix
                if prefix in VALID_HYUNDAI_PREFIXES:
                    part_number = f"{prefix}-{number}"
            
            if part_number:
                break
    
    # Special case for common parts (added XKCH-00054)
    if 'XKCH' in clean_text and ('VALVE' in clean_text or 'SOLENOID' in clean_text):
        part_number = 'XKCH-00054'
    
    # If we couldn't find a part number, check for known prefixes
    if not part_number:
        for prefix in VALID_HYUNDAI_PREFIXES:
            if prefix in clean_text:
                # Look for numbers after the prefix
                parts = clean_text.split(prefix)
                if len(parts) > 1:
                    after_prefix = parts[1]
                    # Find a sequence of 4-7 digits or alphanumeric characters
                    match = re.search(r'[-–—\s]*([0-9A-Z]{4,7})', after_prefix)
                    if match:
                        part_number = f"{prefix}-{match.group(1)}"
                        break
    
    # If we still don't have a part number, we can't proceed
    if not part_number:
        return {'success': False, 'error': 'Could not identify part number'}
    
    # Look up part in known database
    if part_number in KNOWN_PARTS:
        return {
            'partNumber': part_number,
            'partName': KNOWN_PARTS[part_number]['name'],
            'component': KNOWN_PARTS[part_number]['component'],
            'confidence': 0.95
        }
    
    # Now, extract the part name based on the part number
    part_name = ''
    component = ''
    
    # Check for known part special cases
    if part_number == 'KBHP-00001ED':
        part_name = 'O-RING KIT-ALL MODEL'
        component = 'Hydraulic'
    elif part_number.startswith('21M9-'):
        part_name = 'MCU-MACHINE CONTROL UNIT'
        component = 'Electrical'
    elif part_number.startswith('SE23'):
        part_name = 'CONTROL VALVE ASSEMBLY'
        component = 'Hydraulic'
    elif part_number.startswith('XKCH-'):
        part_name = 'VALVE-SOLENOID'
        component = 'Hydraulic'
    else:
        # Try to extract from text
        # Look for text after the part number
        parts = clean_text.split(part_number)
        if len(parts) > 1:
            text_after = parts[1].strip()
            
            # Common part name patterns
            part_name_patterns = [
                r'^[-–—\s]*(VALVE[-–—\s]+SOLENOID)',
                r'^[-–—\s]*(O[-–—]RING\s+KIT[-–—]?\s*ALL\s+MODEL)',
                r'^[-–—\s]*(O[-–—]RING\s+KIT)',
                r'^[-–—\s]*(MCU[-–—]?\s*MACHINE\s+CONTROL\s+UNIT)',
                r'^[-–—\s]*(FILTER\s+ELEMENT)',
                r'^[-–—\s]*(RESISTOR)',
                r'^[-–—\s]*([A-Z][A-Z0-9\s\-]{3,40}?)(?:\s+\(|\s+\/|\s+\d|$)'
            ]
            
            for pattern in part_name_patterns:
                name_match = re.search(pattern, text_after, re.IGNORECASE)
                if name_match:
                    part_name = name_match.group(1).strip()
                    break
            
            # If still no name, take first few words
            if not part_name:
                words = text_after.split()
                if words:
                    part_name = ' '.join(words[:min(5, len(words))])
        
        # Determine component type from part number or name
        prefix = part_number.split('-')[0]
        if prefix in COMPONENT_TYPES["PREFIX_MAP"]:
            component = COMPONENT_TYPES["PREFIX_MAP"][prefix]
        elif part_name:
            # Check for keywords in part name
            for keyword, type_name in COMPONENT_TYPES["KEYWORD_MAP"].items():
                if keyword in part_name:
                    component = type_name
                    break
        
        # Default component if none determined
        if not component:
            component = 'Mechanical'
    
    return {
        'partNumber': part_number,
        'partName': part_name or 'Unknown Part',
        'component': component,
        'confidence': 0.85
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)