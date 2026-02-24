export const CITIZENS_CHARTER = {
  clearance: {
    description: "Barangay Clearance",
    requirements: ["Valid ID", "Proof of Residency"],
    processingTime: "1-3 days",
    fee: "PHP 50",
    procedures: [
      "Submit application form",
      "Present requirements",
      "Await processing",
      "Collect certificate"
    ]
  },
  "barangay id": {
    description: "Barangay ID",
    requirements: ["Valid ID", "Proof of Residency", "2x2 photo"],
    processingTime: "2-5 days",
    fee: "PHP 75",
    procedures: [
      "Fill out ID application form",
      "Submit requirements",
      "Get biometric data recorded",
      "Collect ID"
    ]
  },
  permit: {
    description: "Business Permit",
    requirements: ["DTI Registration", "Proof of Location", "Valid ID"],
    processingTime: "3-7 days",
    fee: "PHP 500-1500",
    procedures: [
      "Submit business information",
      "Present required documents",
      "Processing and verification",
      "Collect permit"
    ]
  },
  "business registration": {
    description: "Business Registration",
    requirements: ["DTI Certificate", "Proof of Address", "Valid ID"],
    processingTime: "1-3 days",
    fee: "PHP 100",
    procedures: [
      "Fill registration form",
      "Submit requirements",
      "Processing",
      "Collect certificate"
    ]
  },
  "certificate of residency": {
    description: "Certificate of Residency",
    requirements: ["Valid ID", "Proof of Residency"],
    processingTime: "1 day",
    fee: "PHP 50",
    procedures: [
      "Submit request form",
      "Present ID and residency proof",
      "Processing",
      "Collect certificate"
    ]
  }
};