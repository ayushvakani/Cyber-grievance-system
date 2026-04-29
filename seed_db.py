"""
seed_db.py  –  Populate the complaints table with rich demo data.
Run from project root:  python seed_db.py
"""

import sys, os, uuid
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(__file__))

from backend.db.postgres import SessionLocal, engine, Base
from backend.models.complaint import Complaint

# ── Make sure tables exist ──────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Seed data ───────────────────────────────────────────────────────────────
CRIME_TYPES = [
    "Phishing/Fraud",
    "UPI/OTP Scam",
    "Ransomware/Hacking",
    "Identity Theft",
    "Cyberbullying",
    "Financial Fraud",
    "Child Exploitation",
    "Dark Web Activity",
    "Data Breach",
    "Cryptocurrency Fraud",
]

SEVERITIES   = ["Low", "Medium", "High", "Critical"]
STATUSES     = ["pending", "under_review", "resolved", "escalated"]

NAMES = [
    "Rajesh Kumar","Priya Sharma","Amit Patel","Sunita Verma","Vikram Singh",
    "Neha Gupta","Suresh Yadav","Anita Joshi","Deepak Mehta","Kavita Nair",
    "Mohan Das","Leela Pillai","Arun Bose","Sujata Rao","Ramesh Iyer",
    "Divya Menon","Sanjeev Khanna","Pooja Agarwal","Manoj Tiwari","Rohini Shah",
    "Harish Bhatt","Meera Reddy","Gopal Sinha","Anjali Devi","Pramod Kulkarni",
    "Shweta Pandey","Kiran Jain","Sunil Chauhan","Rekha Trivedi","Ashok Mishra",
    "Poonam Saxena","Naresh Patil","Varsha Desai","Ravi Shankar","Nalini Pillai",
    "Gaurav Thakur","Seema Kapoor","Vikas Rastogi","Sonal Chandra","Nitin Bhatia",
]

LOCATIONS = [
    "Mumbai, Maharashtra","Delhi, NCR","Bengaluru, Karnataka","Hyderabad, Telangana",
    "Chennai, Tamil Nadu","Kolkata, West Bengal","Pune, Maharashtra","Ahmedabad, Gujarat",
    "Jaipur, Rajasthan","Lucknow, Uttar Pradesh","Bhopal, Madhya Pradesh","Patna, Bihar",
    "Chandigarh, Punjab","Surat, Gujarat","Nagpur, Maharashtra","Indore, Madhya Pradesh",
]

COMPLAINT_TEMPLATES = {
    "Phishing/Fraud": [
        "I received an email claiming to be from SBI Bank asking me to verify my account. I clicked the link and entered my credentials. Later I found ₹42,000 debited from my account.",
        "A fake income tax refund portal tricked me into submitting PAN details and bank account information. My account was wiped of ₹1,15,000.",
    ],
    "UPI/OTP Scam": [
        "Received a call from someone posing as Paytm support. They asked for OTP to 'verify' my account. ₹25,000 was transferred immediately after I shared the OTP.",
        "A person called claiming to be from NPCI, said my UPI would be blocked. I shared OTP under pressure and lost ₹68,500.",
    ],
    "Ransomware/Hacking": [
        "All files on my office server are now encrypted and a ransom note demands ₹5,00,000 in Bitcoin within 48 hours.",
        "My company email was hacked. Attackers sent fraudulent invoices to our clients impersonating our CEO, diverting ₹12,00,000.",
    ],
    "Identity Theft": [
        "Found that a credit card was taken in my name using my Aadhaar and PAN. Loans totalling ₹3,50,000 are now showing in my CIBIL report.",
        "Someone created a fake social media profile using my photos and is using it for online scams impersonating me.",
    ],
    "Cyberbullying": [
        "My teenage daughter is being harassed through repeated threatening messages on Instagram. The attacker is also sharing morphed photos.",
        "Received continuous hate messages, abusive comments, and death threats on Twitter/X from an anonymous account.",
    ],
    "Financial Fraud": [
        "I was lured into a fake stock investment scheme promising 40% monthly returns. Lost ₹8,00,000 before realising it was a Ponzi scheme.",
        "An online trading platform claiming SEBI registration disappeared with my initial investment of ₹2,20,000.",
    ],
    "Child Exploitation": [
        "My minor child was contacted by an adult on a gaming platform requesting inappropriate photos in exchange for in-game currency.",
        "Found disturbing conversation logs on my child's device showing grooming behaviour by someone pretending to be a classmate.",
    ],
    "Dark Web Activity": [
        "My Aadhaar data, passport scan, and bank account details appeared on a dark web marketplace being sold for ₹200.",
        "I discovered our company's internal HR database leaked on a Tor hidden service including salary, medical, and contact records.",
    ],
    "Data Breach": [
        "My personal data including email, phone, and address leaked from an e-commerce platform. I'm now receiving targeted spam and vishing calls.",
        "Healthcare data breach exposed my medical history including prescriptions and diagnosis details on a public URL.",
    ],
    "Cryptocurrency Fraud": [
        "A fake crypto exchange called 'QuickCoin' convinced me to deposit ₹4,50,000 in USDT. The platform became inaccessible after the deposit.",
        "Received an NFT airdrop which when clicked drained my entire MetaMask wallet of ₹1,80,000 in ETH.",
    ],
}

SUMMARIES = {
    "Phishing/Fraud":      "Victim deceived via fake banking portal into revealing credentials leading to unauthorized fund transfer.",
    "UPI/OTP Scam":        "Victim coerced by social engineering into sharing OTP resulting in immediate financial loss via UPI.",
    "Ransomware/Hacking":  "Critical infrastructure compromised; ransomware deployed encrypting all organizational data assets.",
    "Identity Theft":      "Perpetrator used victim's KYC documents to fraudulently obtain credit facilities without consent.",
    "Cyberbullying":       "Victim subjected to sustained online harassment, threats, and non-consensual image sharing.",
    "Financial Fraud":     "Victim defrauded via fake investment scheme promising guaranteed high returns on digital assets.",
    "Child Exploitation":  "Minor child targeted for grooming and solicitation of inappropriate content by unknown adult.",
    "Dark Web Activity":   "Sensitive personal/organizational data confirmed available for sale on underground dark web markets.",
    "Data Breach":         "Large-scale unauthorized access to personal data repository resulting in mass exposure of PII.",
    "Cryptocurrency Fraud":"Victim defrauded by fake cryptocurrency exchange or wallet drainer smart contract attack.",
}

SECTIONS = {
    "Phishing/Fraud":      "IT Act Sec 66D, IPC Sec 420, IPC Sec 419",
    "UPI/OTP Scam":        "IT Act Sec 66C, IT Act Sec 66D, IPC Sec 420",
    "Ransomware/Hacking":  "IT Act Sec 66, IT Act Sec 66B, IT Act Sec 43",
    "Identity Theft":      "IT Act Sec 66C, IPC Sec 468, IPC Sec 471",
    "Cyberbullying":       "IT Act Sec 67, IPC Sec 354D, IPC Sec 509",
    "Financial Fraud":     "IPC Sec 420, SEBI Act Sec 12A, IPC Sec 406",
    "Child Exploitation":  "POCSO Act Sec 13, IT Act Sec 67B, IPC Sec 292",
    "Dark Web Activity":   "IT Act Sec 66, IT Act Sec 43, IT Act Sec 72",
    "Data Breach":         "IT Act Sec 43A, IT Act Sec 72A, PDPB Draft",
    "Cryptocurrency Fraud":"IT Act Sec 66D, IPC Sec 420, FEMA applicable",
}

# Confidence ranges by severity to drive the anomaly filter
CONFIDENCE_RANGES = {
    "Critical": (0.15, 0.42),   # always qualifies as anomaly
    "High":     (0.45, 0.75),
    "Medium":   (0.60, 0.85),
    "Low":      (0.70, 0.95),
}

def make_complaint(i: int) -> Complaint:
    crime  = CRIME_TYPES[i % len(CRIME_TYPES)]
    sev    = SEVERITIES[i % len(SEVERITIES)]          # cycle so all 4 are present
    status = STATUSES[i % len(STATUSES)]
    conf   = round(random.uniform(*CONFIDENCE_RANGES[sev]), 3)
    name   = NAMES[i % len(NAMES)]
    phone  = f"+91-{random.randint(7000000000,9999999999)}"
    loc    = LOCATIONS[i % len(LOCATIONS)]

    templates = COMPLAINT_TEMPLATES[crime]
    text  = templates[i % len(templates)]

    # Spread dates over last 120 days
    days_ago = random.randint(0, 120)
    created  = datetime.now() - timedelta(days=days_ago, hours=random.randint(0,23))

    return Complaint(
        complaint_id          = f"CG-2024-{str(i+1).zfill(4)}",
        citizen_name          = name,
        phone                 = phone,
        complaint_text        = text,
        raw_text              = text,
        location              = loc,
        date_of_incident      = (created - timedelta(days=random.randint(1,10))).strftime("%Y-%m-%d"),
        crime_type            = crime,
        severity              = sev,
        severity_reason       = f"Assessed as {sev} based on financial loss magnitude and threat indicators.",
        confidence            = conf,
        summary               = SUMMARIES[crime],
        recommended_sections  = SECTIONS[crime],
        status                = status,
        created_at            = created,
    )


def run():
    db = SessionLocal()
    try:
        existing = db.query(Complaint).count()
        print(f"Existing complaints in DB: {existing}")

        # Clear old seed data (keep real user submissions untouched if any beyond index 40)
        print("Inserting seed complaints...")
        inserted = 0
        for i in range(40):
            cid = f"CG-2024-{str(i+1).zfill(4)}"
            if db.query(Complaint).filter(Complaint.complaint_id == cid).first():
                print(f"  SKIP  {cid} (already exists)")
                continue
            db.add(make_complaint(i))
            inserted += 1

        db.commit()
        total = db.query(Complaint).count()
        print(f"\n✅  Done! Inserted {inserted} new records. Total in DB: {total}")

        # Quick stats
        for sev in SEVERITIES:
            cnt = db.query(Complaint).filter(Complaint.severity == sev).count()
            print(f"   {sev:10s}: {cnt}")

    except Exception as e:
        db.rollback()
        print(f"❌  Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
